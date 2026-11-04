import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="route-loading">Carregando seu projeto…</div>
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
