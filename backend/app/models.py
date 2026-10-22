
import uuid

from sqlalchemy import (
    String, Integer, Boolean, Numeric, Date, DateTime, Text,
    ForeignKey, Computed, func, Uuid, BigInteger
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    products = relationship("Product", back_populates="category")


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    document_type: Mapped[str | None] = mapped_column(String, nullable=True)
    document_number: Mapped[str | None] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sku: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("categories.id"), nullable=True
    )
    purchase_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    sale_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    min_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    category = relationship("Category", back_populates="products")
    sale_items = relationship("SaleItem", back_populates="product")


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sale_number: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    customer_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("customers.id"), nullable=True
    )
    sale_date: Mapped[object] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    discount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    tax: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    payment_method: Mapped[str] = mapped_column(String, nullable=False, default="Efectivo")
    status: Mapped[str] = mapped_column(String, nullable=False, default="Completada")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    receivables = relationship("Receivable", back_populates="sale")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sale_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("sales.id"), nullable=False
    )
    product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("products.id"), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    discount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    line_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")


class Receivable(Base):
    __tablename__ = "receivables"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sale_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("sales.id"), nullable=True
    )
    customer_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("customers.id"), nullable=False
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    original_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    paid_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    balance: Mapped[float | None] = mapped_column(
        Numeric(12, 2), Computed("original_amount - paid_amount"), nullable=True
    )
    due_date: Mapped[object | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="Pendiente")
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    sale = relationship("Sale", back_populates="receivables")
    payments = relationship(
        "ReceivablePayment", back_populates="receivable",
        cascade="all, delete-orphan"
    )


class ReceivablePayment(Base):
    __tablename__ = "receivable_payments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    receivable_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("receivables.id"), nullable=False
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String, nullable=False)
    payment_date: Mapped[object] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    receivable = relationship("Receivable", back_populates="payments")


class CashClosing(Base):
    __tablename__ = "cash_closings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    closing_date: Mapped[object] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    opening_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    cash_sales: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    card_sales: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    transfer_sales: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    digital_wallet_sales: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    other_income: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    expenses: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    expected_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    counted_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    difference: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="Cerrada")
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class CashMovement(Base):
    __tablename__ = "cash_movements"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    closing_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("cash_closings.id"), nullable=True
    )
    sale_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("sales.id"), nullable=True
    )
    receivable_payment_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("receivable_payments.id"), nullable=True
    )
    movement_type: Mapped[str] = mapped_column(String, nullable=False)
    concept: Mapped[str] = mapped_column(String, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String, nullable=False)
    movement_date: Mapped[object] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
