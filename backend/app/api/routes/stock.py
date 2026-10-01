from typing import Annotated
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from app.api.dependencies import require_user
from app.core.config import get_settings
from app.schemas.auth import CurrentUser
from app.schemas.stock import StockOperationInput
from app.services import catalog
router=APIRouter(prefix='/stock')
@router.post('/operations')
async def record_operation(item:StockOperationInput,request: Request,user:Annotated[CurrentUser,Depends(require_user)]):
 # Re-validate with the caller JWT at PostgreSQL, so performed_by is never browser-supplied.
 settings=get_settings()
 if not settings.supabase_url or not settings.supabase_anon_key: raise HTTPException(503,'Stock service is not configured')
 token=request.headers.get('authorization','')
 async with httpx.AsyncClient(timeout=12) as client:
  response=await client.post(f'{settings.supabase_url}/rest/v1/rpc/record_stock_operation',headers={'apikey':settings.supabase_anon_key,'Authorization':token},json={'p_product_id':item.product_id,'p_movement_type':item.operation_type,'p_quantity':str(item.quantity),'p_supplier_id':item.supplier_id,'p_note':item.note,'p_source':'FORM'})
 if response.status_code>=400: raise HTTPException(400,response.json().get('message','Stock operation could not be completed'))
 return response.json()
@router.get('/history')
async def stock_history(request:Request,user:Annotated[CurrentUser,Depends(require_user)], product_id:str|None=None, movement_type:str|None=None):
 params={'select':'*,products(name,sku),suppliers(name),profiles(full_name,role)','order':'created_at.desc','limit':'100'}
 if product_id: params['product_id']=f'eq.{product_id}'
 if movement_type: params['movement_type']=f'eq.{movement_type}'
 # The request is already authenticated above. Use the existing trusted backend
 # client for this joined read because catalogue tables intentionally revoke
 # direct PostgREST table grants from browser roles.
 return await catalog.list_records('stock_movements',params)
