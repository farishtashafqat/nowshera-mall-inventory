import { ArrowUpRight, Boxes, FolderTree, PackageX, TriangleAlert } from 'lucide-react'
import { CategoryDoodle } from '../components/CategoryDoodle'
import { Card, PageContainer } from '../components/ui'
import { categoryPreviews } from '../data/categories'
import { useAuth } from '../components/AuthProvider'
import { getSummary, type Summary } from '../services/api'
import { useEffect, useState } from 'react'

const metrics = [
  { label: 'Total Products', icon: Boxes, tint: 'pink' }, { label: 'Low Stock', icon: TriangleAlert, tint: 'cream' },
  { label: 'Out of Stock', icon: PackageX, tint: 'sand' }, { label: 'Categories', icon: FolderTree, tint: 'taupe' },
]

export function DashboardPage() { const {session}=useAuth();const [summary,setSummary]=useState<Summary|null>(null);useEffect(()=>{if(session) void getSummary(session.access_token).then(setSummary).catch(()=>setSummary(null))},[session]);const values=[summary?.total_products,summary?.low_stock,summary?.out_of_stock,summary?.categories]; return <PageContainer><div className="dashboard-intro"><div><p className="eyebrow">Live catalogue overview</p><h1>Your inventory, clearly organised.</h1><p>Current totals from your secure inventory catalogue.</p></div></div><div className="metrics-grid">{metrics.map(({ label, icon: Icon, tint },i) => <Card key={label} className="metric-card"><span className={`metric-icon ${tint}`}><Icon size={22} /></span><div><p>{label}</p><strong>{summary?values[i]:'—'}</strong><small>{summary?'Live catalogue data':'Loading data…'}</small></div></Card>)}</div><Card className="categories-section"><div className="section-heading"><div><p className="eyebrow">Category doodles</p><h2>A visual language for every aisle</h2><p>Manage real categories and their doodles from the Categories page.</p></div><button className="text-button" disabled>Manage categories <ArrowUpRight size={16} /></button></div><div className="category-grid">{categoryPreviews.map(category => <article className="category-card" key={category.icon}><div className="doodle-wrap"><CategoryDoodle name={category.icon} /></div><div><h3>{category.name}</h3><p>{category.description}</p></div></article>)}</div></Card></PageContainer> }
