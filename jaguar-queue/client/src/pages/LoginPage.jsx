import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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

  const campo = (label, name, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      <input
        name={name} type={type} value={form[name]}
        onChange={handle} placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex flex-col items-center justify-center p-4">
      {/* Brand */}
      <div className="mb-8 text-center">
        <div className="text-6xl mb-3">🐆</div>
        <h1 className="text-3xl font-black text-white tracking-tight">Jaguar Queue</h1>
        <p className="text-blue-300 text-sm mt-1">Sistema de Turnos · UAM Nicaragua</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {['login', 'registro'].map(m => (
            <button key={m} onClick={() => { setModo(m); setError('') }}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                modo === m ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600'
              }`}>
              {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {modo === 'registro' && (
            <>
              {campo('Nombre completo', 'nombre', 'text', 'Ej: María García')}
              {campo('CIF Estudiantil',  'cif',    'text', 'Ej: 2021-0001')}
            </>
          )}
          {campo('Correo institucional', 'email',    'email',    'correo@uam.edu.ni')}
          {campo('Contraseña',           'password', 'password', '••••••••')}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button disabled={cargando}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-xl transition-colors text-sm mt-2">
            {cargando ? 'Procesando...' : modo === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </div>

      <a href="/admin" className="mt-6 text-blue-400 hover:text-white text-xs transition-colors">
        Acceso para administradores →
      </a>
    </div>
  )
}