
from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from .db import get_db
from .models import (
    Category,
    Product,
    Customer,
    Sale,
    SaleItem,
    Receivable,
    ReceivablePayment,
    CashMovement,
)
from .schemas import (
    ProductIn,
    ProductOut,
    ReceivableIn,
    ReceivableOut,
    SaleIn,
    SaleOut,
)
from .config import settings


app = FastAPI(
    title="Ventas, Caja e Inventario API",
    version="1.2.2",
)


# =====================================================
# ESQUEMAS
# =====================================================

class CustomerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    document_type: str | None = None
    document_number: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None


class ReceivablePaymentIn(BaseModel):
    amount: Decimal = Field(gt=0)
    payment_method: str = Field(min_length=1, max_length=50)


class ReceivableUpdate(BaseModel):
    description: str = Field(min_length=1, max_length=250)
    original_amount: Decimal = Field(gt=0)


# =====================================================
# CORS
# =====================================================

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

configured_origin = getattr(settings, "frontend_origin", None)

if configured_origin:
    configured_origin = configured_origin.rstrip("/")
    if configured_origin not in allowed_origins:
        allowed_origins.append(configured_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# FUNCIONES AUXILIARES
# =====================================================

def money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"))


def normalize_payment_method(value: str) -> str:
    method = (value or "efectivo").strip().lower()

    aliases = {
        "crédito": "credito",
        "fiado": "credito",
        "por cobrar": "credito",
        "cash": "efectivo",
        "yape/plin": "yape",
    }

    method = aliases.get(method, method)

    allowed = {
        "efectivo",
        "tarjeta",
        "transferencia",
        "yape",
        "plin",
        "credito",
        "mixto",
    }

    if method not in allowed:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Método de pago no válido: {value}. "
                f"Usa uno de estos: {', '.join(sorted(allowed))}."
            ),
        )

    return method


def normalize_cash_payment_method(value: str) -> str:
    method = normalize_payment_method(value)

    if method in {"credito", "mixto"}:
        return "otro"

    return method


def normalize_sale_status(value: str) -> str:
    status = (value or "completada").strip().lower()

    aliases = {
        "completada": "completada",
        "completado": "completada",
        "pendiente": "pendiente",
        "anulada": "anulada",
        "anulado": "anulada",
    }

    status = aliases.get(status, status)

    if status not in {"pendiente", "completada", "anulada"}:
        raise HTTPException(
            status_code=400,
            detail="Estado no válido. Usa pendiente, completada o anulada.",
        )

    return status


def update_receivable_status(item: Receivable) -> None:
    original = money(item.original_amount)
    paid = money(item.paid_amount)

    if original <= 0:
        raise HTTPException(
            status_code=400,
            detail="El importe original debe ser mayor que cero.",
        )

    if paid < 0 or paid > original:
        raise HTTPException(
            status_code=400,
            detail="El importe abonado no puede superar la deuda original.",
        )

    item.original_amount = original
    item.paid_amount = paid

    # No asignar item.balance.
    # PostgreSQL calcula automáticamente la columna balance.

    if paid == original:
        item.status = "pagada"
    elif paid > 0:
        item.status = "parcial"
    else:
        item.status = "pendiente"


# =====================================================
# SALUD
# =====================================================

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "ventas-caja-inventario",
    }


# =====================================================
# CLIENTES
# =====================================================

@app.get("/api/customers")
def list_customers(db: Session = Depends(get_db)):
    customers = db.scalars(
        select(Customer).order_by(Customer.name.asc())
    ).all()

    return [
        {
            "id": customer.id,
            "name": customer.name,
            "document_type": customer.document_type,
            "document_number": customer.document_number,
            "phone": customer.phone,
            "email": customer.email,
            "address": customer.address,
            "active": customer.active,
            "created_at": customer.created_at,
        }
        for customer in customers
    ]


@app.post("/api/customers", status_code=201)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
):
    name = payload.name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="El nombre del cliente es obligatorio.",
        )

    customer = Customer(
        name=name,
        document_type=payload.document_type,
        document_number=payload.document_number,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        active=True,
    )

    db.add(customer)

    try:
        db.commit()
        db.refresh(customer)
    except IntegrityError as e:
        db.rollback()
        print("ERROR AL REGISTRAR CLIENTE:", repr(e.orig))
        raise HTTPException(
            status_code=409,
            detail=(
                "No se pudo registrar el cliente. "
                "Verifica si el documento ya existe."
            ),
        )

    return {
        "id": customer.id,
        "name": customer.name,
        "document_type": customer.document_type,
        "document_number": customer.document_number,
        "phone": customer.phone,
        "email": customer.email,
        "address": customer.address,
        "active": customer.active,
        "created_at": customer.created_at,
    }


# =====================================================
# CATEGORÍAS
# =====================================================

@app.get("/api/categories")
def list_categories(db: Session = Depends(get_db)):
    categories = db.scalars(
        select(Category).order_by(Category.name.asc())
    ).all()

    return [
        {
            "id": category.id,
            "name": category.name,
            "description": category.description,
            "active": category.active,
            "created_at": category.created_at,
        }
        for category in categories
    ]


# =====================================================
# PRODUCTOS
# =====================================================

@app.get("/api/products", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)):
    return list(
        db.scalars(
            select(Product).order_by(Product.created_at.desc())
        ).all()
    )


@app.post(
    "/api/products",
    response_model=ProductOut,
    status_code=201,
)
def create_product(
    payload: ProductIn,
    db: Session = Depends(get_db),
):
    existing = db.scalar(
        select(Product).where(Product.sku == payload.sku)
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Ya existe un producto con ese SKU.",
        )

    if payload.category_id is not None:
        if not db.get(Category, payload.category_id):
            raise HTTPException(404, "Categoría no encontrada.")

    item = Product(**payload.model_dump())
    db.add(item)

    try:
        db.commit()
        db.refresh(item)
    except IntegrityError as e:
        db.rollback()
        print("ERROR AL CREAR PRODUCTO:", repr(e.orig))
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo crear el producto: {str(e.orig)}",
        )

    return item


@app.put(
    "/api/products/{product_id}",
    response_model=ProductOut,
)
def update_product(
    product_id: int,
    payload: ProductIn,
    db: Session = Depends(get_db),
):
    item = db.get(Product, product_id)

    if not item:
        raise HTTPException(404, "Producto no encontrado.")

    duplicate = db.scalar(
        select(Product).where(
            Product.sku == payload.sku,
            Product.id != product_id,
        )
    )

    if duplicate:
        raise HTTPException(
            status_code=409,
            detail="Ya existe otro producto con ese SKU.",
        )

    if payload.category_id is not None:
        if not db.get(Category, payload.category_id):
            raise HTTPException(404, "Categoría no encontrada.")

    for key, value in payload.model_dump().items():
        setattr(item, key, value)

    try:
        db.commit()
        db.refresh(item)
    except IntegrityError as e:
        db.rollback()
        print("ERROR AL ACTUALIZAR PRODUCTO:", repr(e.orig))
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo actualizar el producto: {str(e.orig)}",
        )

    return item


@app.delete("/api/products/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    item = db.get(Product, product_id)

    if not item:
        raise HTTPException(404, "Producto no encontrado.")

    used_in_sales = db.scalar(
        select(SaleItem.id)
        .where(SaleItem.product_id == product_id)
        .limit(1)
    )

    try:
        if used_in_sales:
            item.active = False
        else:
            db.delete(item)

        db.commit()

    except IntegrityError as e:
        db.rollback()
        print("ERROR AL ELIMINAR PRODUCTO:", repr(e.orig))
        raise HTTPException(
            status_code=409,
            detail=(
                "No se puede eliminar el producto "
                "porque tiene registros relacionados."
            ),
        )


# =====================================================
# CUENTAS POR COBRAR
# =====================================================

@app.get(
    "/api/receivables",
    response_model=list[ReceivableOut],
)
def list_receivables(db: Session = Depends(get_db)):
    return list(
        db.scalars(
            select(Receivable).order_by(Receivable.created_at.desc())
        ).all()
    )


@app.post(
    "/api/receivables",
    response_model=ReceivableOut,
    status_code=201,
)
def create_receivable(
    payload: ReceivableIn,
    db: Session = Depends(get_db),
):
    customer = db.get(Customer, payload.customer_id)

    if not customer:
        raise HTTPException(404, "Cliente no encontrado.")

    original = money(payload.original_amount)
    paid = money(payload.paid_amount)

    if original <= 0:
        raise HTTPException(
            status_code=400,
            detail="El importe debe ser mayor que cero.",
        )

    if paid < 0 or paid > original:
        raise HTTPException(
            status_code=400,
            detail=(
                "El importe abonado debe estar entre cero "
                "y el importe original."
            ),
        )

    if payload.sale_id is not None and not db.get(Sale, payload.sale_id):
        raise HTTPException(404, "Venta asociada no encontrada.")

    item = Receivable(
        customer_id=payload.customer_id,
        sale_id=payload.sale_id,
        description=payload.description,
        original_amount=original,
        paid_amount=paid,
        due_date=payload.due_date,
        status="pendiente",
    )

    update_receivable_status(item)
    db.add(item)

    try:
        db.commit()
        db.refresh(item)
    except IntegrityError as e:
        db.rollback()
        print("ERROR AL CREAR CUENTA POR COBRAR:", repr(e.orig))
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo registrar la cuenta por cobrar: {str(e.orig)}",
        )

    return item


# EDITAR UNA DEUDA EXISTENTE
@app.put(
    "/api/receivables/{item_id}",
    response_model=ReceivableOut,
)
def update_receivable(
    item_id: int,
    payload: ReceivableUpdate,
    db: Session = Depends(get_db),
):
    item = db.scalar(
        select(Receivable)
        .where(Receivable.id == item_id)
        .with_for_update()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Cuenta por cobrar no encontrada.",
        )

    new_amount = money(payload.original_amount)
    paid = money(item.paid_amount)
    description = payload.description.strip()

    if new_amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="El monto debe ser mayor que cero.",
        )

    if new_amount < paid:
        raise HTTPException(
            status_code=400,
            detail=(
                f"El monto no puede ser menor que lo ya abonado: "
                f"S/ {paid:.2f}."
            ),
        )

    if not description:
        raise HTTPException(
            status_code=400,
            detail="El concepto de la deuda es obligatorio.",
        )

    try:
        item.description = description
        item.original_amount = new_amount

        # Mantiene el importe abonado existente.
        # No asigna balance porque es una columna generada.
        update_receivable_status(item)

        db.commit()
        db.refresh(item)

    except IntegrityError as e:
        db.rollback()
        print("ERROR AL EDITAR CUENTA POR COBRAR:", repr(e.orig))
        raise HTTPException(
            status_code=400,
            detail="No se pudo actualizar la deuda.",
        )

    return item


# REGISTRAR UN ABONO
@app.post(
    "/api/receivables/{item_id}/pay",
    response_model=ReceivableOut,
)
def pay_receivable(
    item_id: int,
    payload: ReceivablePaymentIn,
    db: Session = Depends(get_db),
):
    item = db.scalar(
        select(Receivable)
        .where(Receivable.id == item_id)
        .with_for_update()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Cuenta por cobrar no encontrada.",
        )

    balance = money(item.balance)

    if balance <= 0:
        raise HTTPException(400, "Esta cuenta ya está pagada.")

    amount = money(payload.amount)

    if amount <= 0:
        raise HTTPException(400, "El abono debe ser mayor que cero.")

    if amount > balance:
        raise HTTPException(
            status_code=400,
            detail=f"El abono no puede superar el saldo pendiente de S/ {balance:.2f}.",
        )

    payment_method = normalize_payment_method(payload.payment_method)

    if payment_method in {"credito", "mixto"}:
        raise HTTPException(
            status_code=400,
            detail=(
                "Para registrar un abono, selecciona efectivo, tarjeta, "
                "transferencia, yape o plin."
            ),
        )

    now = datetime.now(timezone.utc)

    try:
        item.paid_amount = money(item.paid_amount) + amount
        update_receivable_status(item)

        payment = ReceivablePayment(
            receivable_id=item.id,
            amount=amount,
            payment_method=payment_method,
            payment_date=now,
            notes=f"Abono de cuenta por cobrar #{item.id}",
        )

        db.add(payment)
        db.flush()

        db.add(
            CashMovement(
                receivable_payment_id=payment.id,
                movement_type="ingreso",
                concept=f"Abono de cuenta por cobrar #{item.id}",
                amount=amount,
                payment_method=normalize_cash_payment_method(payment_method),
                movement_date=now,
                notes="Ingreso generado por un abono",
            )
        )

        db.commit()
        db.refresh(item)

    except IntegrityError as e:
        db.rollback()
        print("ERROR AL REGISTRAR ABONO:", repr(e.orig))
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo registrar el abono: {str(e.orig)}",
        )

    return item


# =====================================================
# VENTAS
# =====================================================

@app.get("/api/sales", response_model=list[SaleOut])
def list_sales(db: Session = Depends(get_db)):
    statement = (
        select(Sale)
        .options(selectinload(Sale.items))
        .order_by(Sale.created_at.desc())
        .limit(100)
    )

    return list(db.scalars(statement).all())


@app.post(
    "/api/sales",
    response_model=SaleOut,
    status_code=201,
)
def create_sale(
    payload: SaleIn,
    db: Session = Depends(get_db),
):
    if payload.customer_id is not None:
        customer = db.get(Customer, payload.customer_id)

        if not customer:
            raise HTTPException(404, "Cliente no encontrado.")

    if not payload.items:
        raise HTTPException(
            status_code=400,
            detail="Agrega al menos un producto a la venta.",
        )

    payment_method = normalize_payment_method(payload.payment_method)
    sale_status = normalize_sale_status(payload.status)

    sale_items = []
    subtotal = Decimal("0.00")

    try:
        for requested in payload.items:
            product = db.scalar(
                select(Product)
                .where(Product.id == requested.product_id)
                .with_for_update()
            )

            if not product or not product.active:
                raise HTTPException(
                    status_code=404,
                    detail=(
                        f"Producto {requested.product_id} "
                        "no encontrado o inactivo."
                    ),
                )

            if requested.quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="La cantidad debe ser mayor que cero.",
                )

            if product.stock < requested.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Stock insuficiente para {product.name}. "
                        f"Disponible: {product.stock}."
                    ),
                )

            unit_price = (
                money(requested.unit_price)
                if requested.unit_price is not None
                else money(product.sale_price)
            )

            if unit_price < 0:
                raise HTTPException(
                    status_code=400,
                    detail="El precio no puede ser negativo.",
                )

            line_gross = money(unit_price * requested.quantity)
            line_discount = money(requested.discount)

            if line_discount < 0 or line_discount > line_gross:
                raise HTTPException(
                    status_code=400,
                    detail=f"Descuento no válido para {product.name}.",
                )

            line_total = money(line_gross - line_discount)
            subtotal += line_total

            sale_items.append({
                "product": product,
                "quantity": requested.quantity,
                "unit_price": unit_price,
                "discount": line_discount,
                "line_total": line_total,
            })

        subtotal = money(subtotal)
        sale_discount = money(payload.discount)
        tax = money(payload.tax)

        if sale_discount < 0 or sale_discount > subtotal:
            raise HTTPException(
                status_code=400,
                detail="El descuento general no puede superar el subtotal.",
            )

        if tax < 0:
            raise HTTPException(
                status_code=400,
                detail="El impuesto no puede ser negativo.",
            )

        total = money(subtotal - sale_discount + tax)

        now = datetime.now(timezone.utc)
        sale_number = (
            f"V-{now.strftime('%Y%m%d%H%M%S')}-"
            f"{uuid4().hex[:6].upper()}"
        )

        sale = Sale(
            sale_number=sale_number,
            customer_id=payload.customer_id,
            sale_date=now,
            subtotal=subtotal,
            discount=sale_discount,
            tax=tax,
            total=total,
            payment_method=payment_method,
            status=sale_status,
            notes=payload.notes,
        )

        db.add(sale)
        db.flush()

        for detail in sale_items:
            product = detail["product"]
            product.stock -= detail["quantity"]

            db.add(
                SaleItem(
                    sale_id=sale.id,
                    product_id=product.id,
                    quantity=detail["quantity"],
                    unit_price=detail["unit_price"],
                    discount=detail["discount"],
                    line_total=detail["line_total"],
                )
            )

        db.flush()

        if payment_method != "credito" and sale_status == "completada":
            db.add(
                CashMovement(
                    sale_id=sale.id,
                    movement_type="ingreso",
                    concept=f"Venta {sale.sale_number}",
                    amount=total,
                    payment_method=normalize_cash_payment_method(
                        payment_method
                    ),
                    movement_date=now,
                    notes="Ingreso generado por venta",
                )
            )

        db.commit()

        return db.scalar(
            select(Sale)
            .options(selectinload(Sale.items))
            .where(Sale.id == sale.id)
        )

    except HTTPException:
        db.rollback()
        raise

    except IntegrityError as e:
        db.rollback()
        print("ERROR AL REGISTRAR VENTA:", repr(e.orig))
        raise HTTPException(
            status_code=400,
            detail=f"Error de base de datos al registrar venta: {str(e.orig)}",
        )


# =====================================================
# DASHBOARD
# =====================================================

@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)):
    today = datetime.now(timezone.utc).date()

    products_count = (
        db.scalar(select(func.count()).select_from(Product)) or 0
    )

    low_stock = (
        db.scalar(
            select(func.count())
            .select_from(Product)
            .where(
                Product.active.is_(True),
                Product.stock <= Product.min_stock,
            )
        ) or 0
    )

    pending = (
        db.scalar(
            select(func.coalesce(func.sum(Receivable.balance), 0))
            .where(Receivable.balance > 0)
        ) or 0
    )

    paid_today = (
        db.scalar(
            select(func.coalesce(func.sum(ReceivablePayment.amount), 0))
            .where(
                func.date(ReceivablePayment.payment_date) == today
            )
        ) or 0
    )

    sales_today = (
        db.scalar(
            select(func.coalesce(func.sum(Sale.total), 0))
            .where(
                func.date(Sale.sale_date) == today,
                Sale.status != "anulada",
            )
        ) or 0
    )

    return {
        "products": products_count,
        "low_stock": low_stock,
        "pending": float(pending),
        "paid_today": float(paid_today),
        "sales_today": float(sales_today),
    }
