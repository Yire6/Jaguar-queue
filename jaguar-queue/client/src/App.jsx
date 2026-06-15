import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage        from './pages/LoginPage'
import AdminLoginPage   from './pages/AdminLoginPage'
import StudentDashboard from './pages/StudentDashboard'
import AdminDashboard   from './pages/AdminDashboard'

function Spinner({ message = 'Cargando...' }) {
  return (
    <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#002855] border-t-[#C8952A] rounded-full animate-spin mx-auto" />
        <p className="text-slate-500 text-sm font-medium">{message}</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner message="Verificando sesión..." />
  return user ? children : <Navigate to="/" replace />
}

function AdminRoute({ children }) {
  const { user, perfil, loading } = useAuth()
  if (loading)              return <Spinner message="Verificando permisos..." />
  if (!user)                return <Navigate to="/admin" replace />
  if (!perfil)              return <Spinner message="Cargando perfil..." />
  if (perfil.rol !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"                element={<LoginPage />} />
      <Route path="/admin"           element={<AdminLoginPage />} />
      <Route path="/dashboard"       element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="*"                element={<Navigate to="/" replace />} />
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