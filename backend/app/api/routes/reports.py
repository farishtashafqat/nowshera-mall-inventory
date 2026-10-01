from typing import Annotated
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Response, HTTPException
import csv
from io import StringIO
from app.api.dependencies import require_user
from app.schemas.auth import CurrentUser
from app.services import catalog
router=APIRouter(prefix='/reports')
async def data(user:CurrentUser):
 products=await catalog.list_records('products' if user.role=='manager' else 'active_products_staff',{'select':'*,categories(name)','order':'name'})
 movements=await catalog.list_records('stock_movements',{'select':'*,products(name,sku),profiles(full_name,role)','order':'created_at.desc','limit':'100'})
 return products,movements
def filtered_moves(movements, days:int, start:str|None, end:str|None):
 cutoff=datetime.now(timezone.utc)-timedelta(days=days); result=[m for m in movements if datetime.fromisoformat(m['created_at'].replace('Z','+00:00'))>=cutoff]
 if start: result=[m for m in result if m['created_at'][:10]>=start]
 if end: result=[m for m in result if m['created_at'][:10]<=end]
 return result
def summary_data(products, movements, user):
 result={'total_products':len(products),'total_units':sum(float(p['current_stock']) for p in products),'low_stock':sum(1 for p in products if p['current_stock']>0 and p['current_stock']<=p['low_stock_threshold']),'out_of_stock':sum(1 for p in products if p['current_stock']==0),'units_received':sum(float(m['quantity']) for m in movements if m['movement_type']=='STOCK_IN'),'units_sold':sum(float(m['quantity']) for m in movements if m['movement_type']=='SALE'),'units_damaged':sum(float(m['quantity']) for m in movements if m['movement_type']=='DAMAGE')}
 if user.role=='manager': result.update({'inventory_cost_value':sum(float(p['current_stock'])*float(p['cost_price']) for p in products),'potential_retail_value':sum(float(p['current_stock'])*float(p['selling_price']) for p in products)})
 return result
@router.get('/dashboard')
async def dashboard(user:Annotated[CurrentUser,Depends(require_user)], days:int=30, start:str|None=None, end:str|None=None):
 products,movements=await data(user); moves=filtered_moves(movements,days,start,end); groups={}
 for p in products:
  name=(p.get('categories')or{}).get('name','Uncategorised'); g=groups.setdefault(name,{'category':name,'products':0,'units':0,'low_stock':0,'out_of_stock':0});g['products']+=1;g['units']+=float(p['current_stock']);g['low_stock']+=int(p['current_stock']>0 and p['current_stock']<=p['low_stock_threshold']);g['out_of_stock']+=int(p['current_stock']==0)
 return {'summary':summary_data(products,moves,user),'inventory':products,'movements':moves,'categories':list(groups.values())}
@router.get('/summary')
async def summary(user:Annotated[CurrentUser,Depends(require_user)], days:int=30, start:str|None=None, end:str|None=None):
 products,movements=await data(user); cutoff=datetime.now(timezone.utc)-timedelta(days=days)
 current=[m for m in movements if datetime.fromisoformat(m['created_at'].replace('Z','+00:00'))>=cutoff]
 if start: current=[m for m in current if m['created_at'][:10]>=start]
 if end: current=[m for m in current if m['created_at'][:10]<=end]
 result={'total_products':len(products),'total_units':sum(float(p['current_stock']) for p in products),'low_stock':sum(1 for p in products if p['current_stock']>0 and p['current_stock']<=p['low_stock_threshold']),'out_of_stock':sum(1 for p in products if p['current_stock']==0),'units_received':sum(float(m['quantity']) for m in current if m['movement_type']=='STOCK_IN'),'units_sold':sum(float(m['quantity']) for m in current if m['movement_type']=='SALE'),'units_damaged':sum(float(m['quantity']) for m in current if m['movement_type']=='DAMAGE')}
 if user.role=='manager': result.update({'inventory_cost_value':sum(float(p['current_stock'])*float(p['cost_price']) for p in products),'potential_retail_value':sum(float(p['current_stock'])*float(p['selling_price']) for p in products)})
 return result
@router.get('/inventory')
async def inventory(user:Annotated[CurrentUser,Depends(require_user)]):
 products,_=await data(user); return products
@router.get('/movements')
async def movements(user:Annotated[CurrentUser,Depends(require_user)], days:int=30, start:str|None=None, end:str|None=None):
 _,moves=await data(user); cutoff=datetime.now(timezone.utc)-timedelta(days=days); moves=[m for m in moves if datetime.fromisoformat(m['created_at'].replace('Z','+00:00'))>=cutoff]
 if start: moves=[m for m in moves if m['created_at'][:10]>=start]
 if end: moves=[m for m in moves if m['created_at'][:10]<=end]
 return moves
@router.get('/categories')
async def categories(user:Annotated[CurrentUser,Depends(require_user)]):
 products,_=await data(user); groups={}
 for p in products:
  name=(p.get('categories') or {}).get('name','Uncategorised'); g=groups.setdefault(name,{'category':name,'products':0,'units':0,'low_stock':0,'out_of_stock':0});g['products']+=1;g['units']+=float(p['current_stock']);g['low_stock']+=int(p['current_stock']>0 and p['current_stock']<=p['low_stock_threshold']);g['out_of_stock']+=int(p['current_stock']==0)
 return list(groups.values())
@router.get('/export/{kind}')
async def export(kind:str,user:Annotated[CurrentUser,Depends(require_user)]):
 products,moves=await data(user); output=StringIO(); writer=csv.writer(output)
 if kind in ('inventory','low-stock','out-of-stock'):
  rows=products
  if kind=='low-stock': rows=[p for p in rows if p['current_stock']>0 and p['current_stock']<=p['low_stock_threshold']]
  if kind=='out-of-stock': rows=[p for p in rows if p['current_stock']==0]
  head=['Product','SKU','Category','Current Stock','Unit','Threshold','Status','Selling Price']
  if user.role=='manager': head+=['Cost Price','Inventory Cost Value','Potential Retail Value']
  writer.writerow(head)
  for p in rows:
   status='Out of Stock' if p['current_stock']==0 else 'Low Stock' if p['current_stock']<=p['low_stock_threshold'] else 'Normal'; row=[p['name'],p['sku'],(p.get('categories')or{}).get('name',''),p['current_stock'],p['unit'],p['low_stock_threshold'],status,p['selling_price']]
   if user.role=='manager': row += [p['cost_price'],float(p['current_stock'])*float(p['cost_price']),float(p['current_stock'])*float(p['selling_price'])]
   writer.writerow(row)
 elif kind=='movements':
  writer.writerow(['Date/Time','Product','SKU','Movement Type','Quantity','Before','After','Performed By','Source','Note'])
  for m in moves: writer.writerow([m['created_at'],(m.get('products')or{}).get('name',''),(m.get('products')or{}).get('sku',''),m['movement_type'],m['quantity'],m['stock_before'],m['stock_after'],(m.get('profiles')or{}).get('full_name',''),m['source'],m.get('note','')])
 else: raise HTTPException(404,'Unknown export')
 return Response(output.getvalue(),media_type='text/csv',headers={'Content-Disposition':f'attachment; filename="{kind}-report.csv"'})
