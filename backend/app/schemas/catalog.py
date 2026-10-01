from decimal import Decimal
from pydantic import BaseModel, EmailStr, Field
from typing import Literal

class CategoryInput(BaseModel): name: str = Field(min_length=1,max_length=100); description: str|None=None; doodle_icon: str; is_active: bool=True
class SupplierInput(BaseModel): name: str=Field(min_length=1,max_length=150); contact_person:str|None=None; phone:str|None=None; email:EmailStr|None=None; address:str|None=None; notes:str|None=None; is_active:bool=True
class ProductInput(BaseModel):
 name:str=Field(min_length=1,max_length=180); sku:str=Field(min_length=1,max_length=80); barcode:str|None=Field(default=None,max_length=80); category_id:str; supplier_id:str|None=None; unit:str=Field(default='piece',max_length=40); opening_stock:Decimal=Field(default=0,ge=0); low_stock_threshold:Decimal=Field(default=0,ge=0); cost_price:Decimal=Field(default=0,ge=0); selling_price:Decimal=Field(default=0,ge=0); is_active:bool=True
