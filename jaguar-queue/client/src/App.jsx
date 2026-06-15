import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage       from './pages/LoginPage'
import AdminLoginPage  from './pages/AdminLoginPage'
import StudentDashboard from './pages/StudentDashboard'
import AdminDashboard  from './pages/AdminDashboard'

function Spinner() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-2">🐆</div>
        <p className="text-slate-400 text-sm">Cargando...</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  return user ? children : <Navigate to="/" replace />
}

function AdminRoute({ children }) {
  const { user, perfil, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user)   return <Navigate to="/admin" replace />
  if (perfil && perfil.rol !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"               element={<LoginPage />} />
      <Route path="/admin"          element={<AdminLoginPage />} />
      <Route path="/dashboard"      element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="*"               element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}