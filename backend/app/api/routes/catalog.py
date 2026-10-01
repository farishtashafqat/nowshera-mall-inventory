from typing import Annotated
from fastapi import APIRouter, Depends, Query
from app.api.dependencies import require_manager, require_user
from app.schemas.auth import CurrentUser
from app.schemas.catalog import CategoryInput,SupplierInput,ProductInput
from app.services import catalog
router=APIRouter()
@router.get('/categories')
async def categories(user:Annotated[CurrentUser,Depends(require_user)]): return await catalog.list_records('categories',{'select':'*','order':'name'})
@router.post('/categories')
async def add_category(item:CategoryInput,_:Annotated[CurrentUser,Depends(require_manager)]): return await catalog.create('categories',item.model_dump())
@router.patch('/categories/{id}')
async def edit_category(id:str,item:CategoryInput,_:Annotated[CurrentUser,Depends(require_manager)]): return await catalog.update('categories',id,item.model_dump())
@router.get('/suppliers')
async def suppliers(user:Annotated[CurrentUser,Depends(require_user)]): return await catalog.list_records('suppliers',{'select':'*','order':'name'})
@router.post('/suppliers')
async def add_supplier(item:SupplierInput,_:Annotated[CurrentUser,Depends(require_manager)]): return await catalog.create('suppliers',item.model_dump(mode='json',exclude_none=True))
@router.patch('/suppliers/{id}')
async def edit_supplier(id:str,item:SupplierInput,_:Annotated[CurrentUser,Depends(require_manager)]): return await catalog.update('suppliers',id,item.model_dump(mode='json',exclude_none=True))
@router.get('/products')
async def products(user:Annotated[CurrentUser,Depends(require_user)], search:str='', category_id:str|None=None, active:bool=True):
 table='products' if user.role=='manager' else 'active_products_staff'; select='*,categories(name),suppliers(name)' if user.role=='manager' else '*'; params={'select':select,'order':'created_at.desc'}
 if category_id: params['category_id']=f'eq.{category_id}'
 if user.role=='manager': params['is_active']=f'eq.{str(active).lower()}'
 if search: params['or']=f'(name.ilike.*{search}*,sku.ilike.*{search}*,barcode.ilike.*{search}*)'
 return await catalog.list_records(table,params)
@router.post('/products')
async def add_product(item:ProductInput,_:Annotated[CurrentUser,Depends(require_manager)]):
 data=item.model_dump(mode='json'); data['current_stock']=data['opening_stock']; return await catalog.create('products',data)
@router.patch('/products/{id}')
async def edit_product(id:str,item:ProductInput,_:Annotated[CurrentUser,Depends(require_manager)]):
 data=item.model_dump(mode='json'); data.pop('opening_stock'); return await catalog.update('products',id,data)
@router.get('/dashboard/summary')
async def dashboard_summary(user:Annotated[CurrentUser,Depends(require_user)]):
 table='products' if user.role=='manager' else 'active_products_staff'
 products=await catalog.list_records(table,{'select':'current_stock,low_stock_threshold'})
 categories=await catalog.list_records('categories',{'select':'id'})
 return {'total_products':len(products),'low_stock':sum(1 for p in products if p['current_stock'] <= p['low_stock_threshold'] and p['current_stock'] > 0),'out_of_stock':sum(1 for p in products if p['current_stock'] == 0),'categories':len(categories)}
