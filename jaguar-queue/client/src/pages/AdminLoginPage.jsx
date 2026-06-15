import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const INPUT = 'w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C8952A] text-sm text-slate-800 placeholder-slate-400 transition-all'
const LABEL = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5'

export default function AdminLoginPage() {
  const [form,     setForm]     = useState({ email: '', password: '' })
  const [error,    setError]    = useState('')
  const [cargando, setCargando] = useState(false)
  const { signIn }              = useAuth()
  const navigate                = useNavigate()

  const submit = async e => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const { error } = await signIn(form.email, form.password)
      if (error) throw error
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Credenciales incorrectas. Verifica tu correo y contraseña.'
        : err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#001A3D] flex flex-col items-center justify-center p-6">

      {/* Branding */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#002855] border-2 border-[#C8952A] rounded-2xl mb-4">
          <span className="text-2xl">🛡️</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Panel Administrativo</h1>
        <p className="text-[#6B8CAE] text-sm mt-1">Jaguar Queue · UAM Nicaragua</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-[#002855] px-6 py-4">
          <p className="text-white text-sm font-semibold">Acceso restringido</p>
          <p className="text-[#A8C4E0] text-xs mt-0.5">Solo para personal autorizado de UAM</p>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className={LABEL}>Correo institucional</label>
            <input type="email" value={form.email} placeholder="admin@uam.edu.ni"
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Contraseña</label>
            <input type="password" value={form.password} placeholder="••••••••"
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              className={INPUT} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-red-700 text-sm font-medium">⚠ {error}</p>
            </div>
          )}

          <button disabled={cargando}
            className="w-full py-3.5 bg-[#C8952A] hover:bg-[#A87820] disabled:bg-slate-300 text-white font-bold rounded-xl transition-all text-sm shadow-sm">
            {cargando ? 'Verificando...' : 'Ingresar al panel'}
          </button>
        </form>
      </div>

      <a href="/" className="mt-6 text-[#6B8CAE] hover:text-[#A8C4E0] text-xs font-medium transition-colors">
        ← Portal de estudiantes
      </a>
    </div>
  )
}