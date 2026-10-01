import { useState } from 'react'
import { BarChart3, Bot, Boxes, Crown, FolderTree, History, LayoutDashboard, LogOut, Menu, PackagePlus, Store, Truck, Users, X } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import type { NavigationItem } from '../types/navigation'
import { useAuth } from '../components/AuthProvider'

const navigation: NavigationItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard }, { label: 'Products', path: '/products', icon: Boxes },
  { label: 'Categories', path: '/categories', icon: FolderTree }, { label: 'Suppliers', path: '/suppliers', icon: Truck },
  { label: 'Stock Operations', path: '/stock-operations', icon: PackagePlus }, { label: 'Stock History', path: '/stock-history', icon: History },
  { label: 'Reports', path: '/reports', icon: BarChart3 }, { label: 'AI Assistant', path: '/ai-assistant', icon: Bot },
]

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth(); const visibleNavigation = user?.role === 'manager' ? [...navigation, { label: 'Staff Management', path: '/staff-management', icon: Users }, { label: 'Manager Management', path: '/manager-management', icon: Crown }] : navigation
  return <aside className="sidebar"><div className="brand"><span className="brand-mark"><Store size={22} /></span><span><strong>Nowshera Mall</strong><small>Inventory system</small></span></div><nav aria-label="Main navigation">{visibleNavigation.map(({ label, path, icon: Icon }) => <NavLink onClick={onNavigate} key={path} to={path} end={path === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={19} /><span>{label}</span></NavLink>)}</nav><div className="user-card"><strong>{user?.full_name || 'Mall user'}</strong><small>{user?.role === 'manager' ? 'Manager' : 'Staff'}{user?.department ? ` · ${user.department}` : ''}</small><button onClick={() => void signOut()}><LogOut size={15} /> Log out</button></div></aside>
}

export function AppLayout() {
  const [isMenuOpen, setMenuOpen] = useState(false)
  return <div className="app-shell"><div className={`mobile-overlay ${isMenuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)} /><div className={`mobile-sidebar ${isMenuOpen ? 'show' : ''}`}><button className="icon-button close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X /></button><Sidebar onNavigate={() => setMenuOpen(false)} /></div><div className="desktop-sidebar"><Sidebar /></div><div className="app-content"><header className="topbar"><button className="icon-button menu-button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu /></button><div><p className="breadcrumb">Nowshera Shopping Mall</p><p className="topbar-title">Inventory workspace</p></div><span className="preview-badge">Preview</span></header><Outlet /></div></div>
}
