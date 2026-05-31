import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { isTokenExpired } from '../lib/token'

export default function ProtectedRoute() {
  const { token, hasHydrated } = useAuthStore()

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-indigo-600" />
      </div>
    )
  }

  if (!token || isTokenExpired(token)) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
