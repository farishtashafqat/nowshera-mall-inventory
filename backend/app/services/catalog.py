from typing import Any
import httpx
from fastapi import HTTPException
from app.core.config import get_settings

def headers() -> dict[str,str]:
 s=get_settings()
 if not s.supabase_url or not s.supabase_service_role_key: raise HTTPException(503,'Catalogue service is not configured')
 return {'apikey':s.supabase_service_role_key,'Authorization':f'Bearer {s.supabase_service_role_key}','Content-Type':'application/json','Prefer':'return=representation'}
async def call(method:str, table:str, *, params:dict[str,str]|None=None, body:dict[str,Any]|None=None) -> Any:
 s=get_settings()
 async with httpx.AsyncClient(timeout=12) as client: r=await client.request(method,f'{s.supabase_url}/rest/v1/{table}',headers=headers(),params=params,json=body)
 if r.status_code>=400:
  if r.status_code==409 or 'duplicate key' in r.text.lower(): raise HTTPException(409,'A record with that unique value already exists')
  raise HTTPException(400,'Catalogue request could not be completed')
 return r.json() if r.content else None
async def list_records(table:str, params:dict[str,str]) -> Any: return await call('GET',table,params=params)
async def create(table:str, data:dict[str,Any]) -> Any: return await call('POST',table,params={'select':'*'},body=data)
async def update(table:str,id:str,data:dict[str,Any]) -> Any: return await call('PATCH',table,params={'id':f'eq.{id}','select':'*'},body=data)
