
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class ProductIn(BaseModel):
    sku: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=150)
    description: Optional[str] = None
    category_id: Optional[int] = None
    purchase_price: float = Field(ge=0)
    sale_price: float = Field(ge=0)
    stock: int = Field(ge=0)
    min_stock: int = Field(default=0, ge=0)
    active: bool = True


class ProductOut(ProductIn):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SaleItemIn(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    unit_price: Optional[float] = Field(default=None, ge=0)
    discount: float = Field(default=0, ge=0)


class SaleIn(BaseModel):
    customer_id: Optional[int] = None
    items: list[SaleItemIn] = Field(min_length=1)
    discount: float = Field(default=0, ge=0)
    tax: float = Field(default=0, ge=0)
    payment_method: str = "Efectivo"
    status: str = "Completada"
    notes: Optional[str] = None


class SaleItemOut(BaseModel):
    id: int
    sale_id: int
    product_id: int
    quantity: int
    unit_price: float
    discount: float
    line_total: float

    model_config = ConfigDict(from_attributes=True)


class SaleOut(BaseModel):
    id: int
    sale_number: str
    customer_id: Optional[int] = None
    sale_date: datetime
    subtotal: float
    discount: float
    tax: float
    total: float
    payment_method: str
    status: str
    notes: Optional[str] = None
    items: list[SaleItemOut] = []

    model_config = ConfigDict(from_attributes=True)


class ReceivableIn(BaseModel):
    customer_id: int
    sale_id: Optional[int] = None
    description: Optional[str] = None
    original_amount: float = Field(gt=0)
    paid_amount: float = Field(default=0, ge=0)
    due_date: Optional[date] = None


class ReceivableOut(BaseModel):
    id: int
    sale_id: Optional[int] = None
    customer_id: int
    description: Optional[str] = None
    original_amount: float
    paid_amount: float
    balance: Optional[float] = None
    due_date: Optional[date] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
