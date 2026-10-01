from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, Field
class StockOperationInput(BaseModel):
 product_id:str; operation_type:Literal['STOCK_IN','SALE','DAMAGE']; quantity:Decimal=Field(gt=0); supplier_id:str|None=None; note:str|None=None
