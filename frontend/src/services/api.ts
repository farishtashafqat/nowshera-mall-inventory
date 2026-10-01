import type { CurrentUser, StaffMember } from '../types/auth'
const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 15000)
  let response: Response
  try { response = await fetch(`${apiUrl}${path}`, { ...options, signal: controller.signal, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers } }) }
  catch (error) { throw new Error(error instanceof DOMException && error.name === 'AbortError' ? 'The server took too long to respond. Please try again.' : 'Cannot reach the inventory server.') }
  finally { window.clearTimeout(timeout) }
  if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.detail || 'Request failed') }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}
export const getCurrentUser = (token: string) => request<CurrentUser>('/auth/me', token)
export const acceptInvitation = (token: string) => request<{message:string}>('/auth/accept-invitation', token, {method:'POST'})
export const getStaff = (token: string) => request<StaffMember[]>('/staff', token)
export const inviteStaff = (token: string, full_name: string, email: string) => request<{ message: string }>('/staff/invitations', token, { method: 'POST', body: JSON.stringify({ full_name, email }) })
export const getManagers = (token: string) => request<StaffMember[]>('/managers', token)
export const inviteManager = (token: string, full_name: string, email: string) => request<{ message: string }>('/managers/invitations', token, { method: 'POST', body: JSON.stringify({ full_name, email }) })
export type Category = {id:string;name:string;description:string|null;doodle_icon:import('../data/categories').CategoryIconName;is_active:boolean}
export type Supplier = {id:string;name:string;contact_person:string|null;phone:string|null;email:string|null;address:string|null;notes:string|null;is_active:boolean}
export type Product = {id:string;name:string;sku:string;barcode:string|null;category_id:string;supplier_id:string|null;unit:string;opening_stock:number;current_stock:number;low_stock_threshold:number;cost_price?:number;selling_price:number;is_active:boolean;categories?:{name:string};suppliers?:{name:string}}
export type Summary={total_products:number;low_stock:number;out_of_stock:number;categories:number}
export const getCategories=(t:string)=>request<Category[]>('/categories',t)
export const saveCategory=(t:string,data:Omit<Category,'id'>,id?:string)=>request<Category[]>(`/categories${id?`/${id}`:''}`,t,{method:id?'PATCH':'POST',body:JSON.stringify(data)})
export const getSuppliers=(t:string)=>request<Supplier[]>('/suppliers',t)
export const saveSupplier=(t:string,data:Omit<Supplier,'id'>,id?:string)=>request<Supplier[]>(`/suppliers${id?`/${id}`:''}`,t,{method:id?'PATCH':'POST',body:JSON.stringify(data)})
export const getProducts=(t:string,q='')=>request<Product[]>(`/products${q?`?${q}`:''}`,t)
export const saveProduct=(t:string,data:Omit<Product,'id'|'current_stock'|'categories'|'suppliers'>,id?:string)=>request<Product[]>(`/products${id?`/${id}`:''}`,t,{method:id?'PATCH':'POST',body:JSON.stringify(data)})
export const getSummary=(t:string)=>request<Summary>('/dashboard/summary',t)
export type Movement={id:string;movement_type:'OPENING'|'STOCK_IN'|'SALE'|'DAMAGE';quantity:number;stock_before:number;stock_after:number;note:string|null;source:'FORM'|'AI';created_at:string;products?:{name:string;sku:string};suppliers?:{name:string};profiles?:{full_name:string;role:string}}
export const recordStock=(t:string,data:{product_id:string;operation_type:'STOCK_IN'|'SALE'|'DAMAGE';quantity:number;supplier_id?:string|null;note?:string|null})=>request<Movement>('/stock/operations',t,{method:'POST',body:JSON.stringify(data)})
export const getHistory=(t:string,q='')=>request<Movement[]>(`/stock/history${q?`?${q}`:''}`,t)
export type ReportSummary={total_products:number;total_units:number;low_stock:number;out_of_stock:number;units_received:number;units_sold:number;units_damaged:number;inventory_cost_value?:number;potential_retail_value?:number}
export const getReportSummary=(t:string,q='')=>request<ReportSummary>(`/reports/summary${q?`?${q}`:''}`,t)
export const getReportInventory=(t:string)=>request<Product[]>('/reports/inventory',t)
export const getReportMovements=(t:string,q:string)=>request<Movement[]>(`/reports/movements?${q}`,t)
export const getReportCategories=(t:string)=>request<Array<{category:string;products:number;units:number;low_stock:number;out_of_stock:number}>>('/reports/categories',t)
export type ReportsDashboard={summary:ReportSummary;inventory:Product[];movements:Movement[];categories:Array<{category:string;products:number;units:number;low_stock:number;out_of_stock:number}>}
export const getReportsDashboard=(t:string,q:string)=>request<ReportsDashboard>(`/reports/dashboard?${q}`,t)
export async function downloadReport(token:string,kind:'inventory'|'low-stock'|'out-of-stock'|'movements'){const response=await fetch(`${apiUrl}/reports/export/${kind}`,{headers:{Authorization:`Bearer ${token}`}});if(!response.ok)throw new Error('Could not export report');const blob=await response.blob();const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`${kind}-report.csv`;link.click();URL.revokeObjectURL(url)}
export type AiProposal={id:string;status:'PENDING'|'CONFIRMED'|'CANCELLED'|'FAILED';product:string;movement_type:'STOCK_IN'|'SALE'|'DAMAGE';quantity:number|string;supplier?:string|null}
export type AiChatResponse={answer:string;proposal?:AiProposal;product_id?:string}
export const chatWithAi=(t:string,message:string)=>request<AiChatResponse>('/ai/chat',t,{method:'POST',body:JSON.stringify({message})})
export const confirmAiProposal=(t:string,id:string)=>request<Movement>(`/ai/proposals/${id}/confirm`,t,{method:'POST'})
export const cancelAiProposal=(t:string,id:string)=>request<AiProposal>(`/ai/proposals/${id}/cancel`,t,{method:'POST'})
