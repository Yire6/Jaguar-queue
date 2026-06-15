import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminLoginPage() {
  const [form,     setForm]     = useState({ email: '', password: '' })
  const [error,    setError]    = useState('')
  const [cargando, setCargando] = useState(false)
  const { signIn }              = useAuth()
  const navigate                = useNavigate()

  const submit = async e => {
    e.preventDefault(); setError(''); setCargando(true)
    try {
      const { error } = await signIn(form.email, form.password)
      if (error) throw error
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-800 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">🛡️</div>
        <h1 className="text-2xl font-black text-white">Panel Administrativo</h1>
        <p className="text-slate-400 text-sm mt-1">Jaguar Queue · UAM Nicaragua</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-4">
        <form onSubmit={submit} className="space-y-4">
          {[['Correo', 'email', 'email', 'admin@uam.edu.ni'], ['Contraseña', 'password', 'password', '••••••••']].map(([label, name, type, ph]) => (
            <div key={name}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
              <input type={type} value={form[name]} placeholder={ph}
                onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-slate-500 text-sm bg-gray-50 focus:bg-white transition-colors" />
            </div>
          ))}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          <button disabled={cargando}
            className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-bold rounded-xl transition-colors text-sm">
            {cargando ? 'Verificando...' : 'Ingresar al panel'}
          </button>
        </form>
      </div>

      <a href="/" className="mt-6 text-slate-500 hover:text-slate-300 text-xs transition-colors">
        ← Portal de estudiantes
      </a>
    </div>
  )
}