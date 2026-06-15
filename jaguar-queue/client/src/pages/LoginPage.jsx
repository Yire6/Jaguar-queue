import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const INPUT = 'w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#002855] text-sm text-slate-800 placeholder-slate-400 transition-all'
const LABEL = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5'

export default function LoginPage() {
  const [modo,     setModo]     = useState('login')
  const [form,     setForm]     = useState({ nombre: '', cif: '', email: '', password: '' })
  const [error,    setError]    = useState('')
  const [cargando, setCargando] = useState(false)
  const { signIn, signUp }      = useAuth()
  const navigate                = useNavigate()

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      if (modo === 'login') {
        const { error } = await signIn(form.email, form.password)
        if (error) throw error
        navigate('/dashboard')
      } else {
        if (!form.nombre || !form.cif || !form.email || !form.password)
          throw new Error('Todos los campos son obligatorios')
        if (form.password.length < 6)
          throw new Error('La contraseña debe tener al menos 6 caracteres')
        const { error } = await signUp(form.email, form.password, form.nombre, form.cif)
        if (error) throw error
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#002855] flex flex-col">

      {/* Header institucional */}
      <div className="px-6 pt-12 pb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#C8952A] rounded-2xl mb-4 shadow-lg">
          <span className="text-3xl">🐆</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Jaguar Queue</h1>
        <p className="text-[#A8C4E0] text-sm mt-1 font-medium">
          Sistema de Gestión de Turnos · UAM Nicaragua
        </p>
      </div>

      {/* Card principal */}
      <div className="flex-1 bg-[#F4F7FA] rounded-t-3xl px-6 pt-8 pb-10">
        {/* Tabs */}
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200 mb-6">
          {[['login', 'Iniciar sesión'], ['registro', 'Registrarse']].map(([m, label]) => (
            <button key={m} onClick={() => { setModo(m); setError('') }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                modo === m
                  ? 'bg-[#002855] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {modo === 'registro' && (
            <>
              <div>
                <label className={LABEL}>Nombre completo</label>
                <input name="nombre" value={form.nombre} onChange={handle}
                  placeholder="Ej: María García López" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>CIF Estudiantil</label>
                <input name="cif" value={form.cif} onChange={handle}
                  placeholder="Ej: 2021-0001" className={INPUT} />
              </div>
            </>
          )}

          <div>
            <label className={LABEL}>Correo institucional</label>
            <input name="email" type="email" value={form.email} onChange={handle}
              placeholder="correo@uam.edu.ni" className={INPUT} />
          </div>

          <div>
            <label className={LABEL}>Contraseña</label>
            <input name="password" type="password" value={form.password} onChange={handle}
              placeholder="Mínimo 6 caracteres" className={INPUT} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-red-700 text-sm font-medium">⚠ {error}</p>
            </div>
          )}

          <button disabled={cargando}
            className="w-full py-3.5 bg-[#002855] hover:bg-[#001A3D] disabled:bg-slate-300 text-white font-bold rounded-xl transition-all text-sm shadow-sm mt-2">
            {cargando
              ? 'Procesando...'
              : modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400 mb-2">¿Eres personal administrativo?</p>
          <a href="/admin"
            className="text-sm font-semibold text-[#002855] hover:text-[#C8952A] transition-colors">
            Acceso para administradores →
          </a>
        </div>
      </div>
    </div>
  )
}