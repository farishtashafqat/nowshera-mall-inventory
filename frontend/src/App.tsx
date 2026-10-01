import { Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { AuthProvider } from './components/AuthProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { StaffManagementPage } from './pages/StaffManagementPage'
import { ManagerManagementPage } from './pages/ManagerManagementPage'
import { CategoriesPage, ProductsPage, SuppliersPage } from './pages/CataloguePages'
import { StockHistoryPage, StockOperationsPage } from './pages/StockPages'
import { StockOperationsFixed } from './pages/StockOperationsFixed'
import { ReportsPage } from './pages/ReportsPage'
import { ReportsComplete } from './pages/ReportsComplete'
import { AiAssistantPage } from './pages/AiAssistantPage'
import { AcceptInvitationPage } from './pages/AcceptInvitationPage'

const upcoming = [
  ['products', 'Products', 'Product records, SKU and barcode management will arrive in Phase 3.'],
  ['categories', 'Categories', 'Category management will arrive in Phase 3.'], ['suppliers', 'Suppliers', 'Supplier management will arrive in Phase 3.'],
  ['stock-operations', 'Stock Operations', 'Stock-in, sales and damage operations will arrive in Phase 4.'], ['stock-history', 'Stock History', 'The audit history will arrive in Phase 4.'],
  ['reports', 'Reports', 'Inventory and financial reports will arrive in Phase 5.'],
] as const

export default function App() { return <AuthProvider><Routes><Route path="/login" element={<LoginPage />} /><Route path="/accept-invitation" element={<AcceptInvitationPage />} /><Route element={<ProtectedRoute />}><Route element={<AppLayout />}><Route index element={<DashboardPage />} /><Route path="products" element={<ProductsPage />} /><Route path="categories" element={<CategoriesPage />} /><Route path="suppliers" element={<SuppliersPage />} /><Route path="stock-operations" element={<StockOperationsFixed />} /><Route path="stock-history" element={<StockHistoryPage />} /><Route path="reports" element={<ReportsComplete />} /><Route path="ai-assistant" element={<AiAssistantPage />} />{upcoming.filter(([path]) => !['products','categories','suppliers','stock-operations','stock-history','reports','ai-assistant'].includes(path)).map(([path, title, description]) => <Route key={path} path={path} element={<ComingSoonPage title={title} description={description} />} />)}<Route path="*" element={<NotFoundPage />} /><Route element={<ProtectedRoute managerOnly />}><Route path="staff-management" element={<StaffManagementPage />} /><Route path="manager-management" element={<ManagerManagementPage />} /></Route></Route></Route></Routes></AuthProvider> }
