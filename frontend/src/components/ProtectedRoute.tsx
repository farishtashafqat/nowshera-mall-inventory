import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { LoadingState } from './ui'
import { AccessDeniedPage } from '../pages/AccessDeniedPage'
export function ProtectedRoute({ managerOnly = false }: { managerOnly?: boolean }) { const { user, loading } = useAuth(); const location = useLocation(); if (loading) return <LoadingState label="Checking your secure session…" />; if (!user) return <Navigate to="/login" replace state={{ from: location }} />; if (managerOnly && user.role !== 'manager') return <AccessDeniedPage />; return <Outlet /> }
