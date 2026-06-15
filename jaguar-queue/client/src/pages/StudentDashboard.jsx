import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

const ESTADO = {
  pendiente:  { label: 'En espera',    badge: 'bg-amber-100 text-amber-800 border-amber-300', card: 'bg-amber-50 border-amber-300', icon: '⏳' },
  en_curso:   { label: '¡Es tu turno!',badge: 'bg-blue-100 text-blue-800 border-blue-300',   card: 'bg-blue-50 border-blue-400',   icon: '🔔' },
  finalizado: { label: 'Finalizado',   badge: 'bg-green-100 text-green-800 border-green-300',card: 'bg-green-50 border-green-300', icon: '✅' },
  cancelado:  { label: 'Cancelado',    badge: 'bg-red-100 text-red-800 border-red-300',      card: 'bg-red-50 border-red-300',     icon: '✖'  },
}

function SeleccionDept({ departamentos, solicitarTurno, solicitando, error }) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-bold text-[#002855]">¿Qué servicio necesitas?</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Selecciona un departamento para obtener tu número de turno
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-red-700 text-sm font-medium">⚠ {error}</p>
        </div>
      )}

      <div className="space-y-3">
        {departamentos.map(dept => (
          <button key={dept.id} onClick={() => solicitarTurno(dept.id)}
            disabled={solicitando}
            className="w-full bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-[#002855] hover:shadow-md active:scale-[0.99] transition-all disabled:opacity-60 group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#002855] text-base group-hover:text-[#0A3D7C]">{dept.nombre}</p>
                <p className="text-slate-500 text-sm mt-0.5 leading-snug">{dept.descripcion}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-3xl font-black text-[#C8952A] leading-none">{dept.turnos_activos}</p>
                <p className="text-xs text-slate-400 mt-0.5">en cola</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center text-xs bg-[#F4F7FA] text-[#002855] border border-slate-200 px-2.5 py-1 rounded-full font-semibold">
                ~{dept.tiempo_prom_min} min por turno
              </span>
              <span className="text-xs text-slate-400">
                Código: <span className="font-mono font-bold">{dept.prefijo_turno}-001</span>
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  const { user, perfil, signOut } = useAuth()
  const navigate                  = useNavigate()

  const [turno,          setTurno]          = useState(null)
  const [departamentos,  setDepartamentos]  = useState([])
  const [cargando,       setCargando]       = useState(true)
  const [errorConexion,  setErrorConexion]  = useState('')
  const [solicitando,    setSolicitando]    = useState(false)
  const [errorSolicitud, setErrorSolicitud] = useState('')
  const [mostrarNuevo,   setMostrarNuevo]   = useState(false)

  const userId = user?.id

  // ── Carga inicial: departamentos + turno activo ──
  useEffect(() => {
    if (!userId) return
    const init = async () => {
      setCargando(true)
      setErrorConexion('')
      try {
        const [dRes, tRes] = await Promise.all([
          api.getDepartamentos(),
          api.getTurnoEstudiante(userId),
        ])
        if (dRes.success) setDepartamentos(dRes.data)
        else setErrorConexion('No se pudieron cargar los departamentos.')
        if (tRes.success) setTurno(tRes.data)
      } catch {
        setErrorConexion('No se puede conectar con el servidor. Verifica que el backend esté corriendo en el puerto 3001.')
      } finally {
        setCargando(false)
      }
    }
    init()
  }, [userId])

  // ── Realtime: refresca turno cuando cambia en BD ──
  useEffect(() => {
    if (!userId) return
    const refreshTurno = async () => {
      const res = await api.getTurnoEstudiante(userId)
      if (res.success) setTurno(res.data)
    }
    const ch = supabase
      .channel(`turno-est-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'turnos',
        filter: `estudiante_id=eq.${userId}`,
      }, () => refreshTurno())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [userId])

  // ── Acciones ──
  const solicitarTurno = async (departamento_id) => {
    setSolicitando(true)
    setErrorSolicitud('')
    try {
      const res = await api.crearTurno(userId, departamento_id)
      if (res.success) { setTurno(res.data); setMostrarNuevo(false) }
      else setErrorSolicitud(res.error || 'No se pudo crear el turno')
    } catch {
      setErrorSolicitud('Error de conexión con el servidor')
    } finally {
      setSolicitando(false)
    }
  }

  const cancelarTurno = async () => {
    if (!turno) return
    await api.cancelarTurno(turno.id)
    const res = await api.getTurnoEstudiante(userId)
    if (res.success) setTurno(res.data)
  }

  // ── Pantalla de carga ──
  if (cargando) return (
    <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#002855] border-t-[#C8952A] rounded-full animate-spin mx-auto" />
        <p className="text-slate-500 text-sm font-medium">Cargando tu turno...</p>
      </div>
    </div>
  )

  // ── Error de conexión ──
  if (errorConexion) return (
    <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-red-200 p-6 max-w-sm w-full text-center shadow-sm">
        <p className="text-3xl mb-3">⚠️</p>
        <h2 className="font-bold text-slate-800 mb-2">Error de conexión</h2>
        <p className="text-slate-500 text-sm">{errorConexion}</p>
        <button onClick={() => window.location.reload()}
          className="mt-4 w-full py-2.5 bg-[#002855] text-white rounded-xl text-sm font-semibold">
          Reintentar
        </button>
      </div>
    </div>
  )

  const cfg         = turno ? ESTADO[turno.estado] : null
  const turnoActivo = turno && ['pendiente', 'en_curso'].includes(turno.estado)
  const turnoFin    = turno && ['finalizado', 'cancelado'].includes(turno.estado)

  return (
    <div className="min-h-screen bg-[#F4F7FA]">

      {/* Header */}
      <header className="bg-[#002855] px-5 pt-5 pb-5 sticky top-0 z-10 shadow-lg">
        <div className="max-w-lg mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🐆</span>
                <span className="text-white font-bold text-base tracking-tight">Jaguar Queue</span>
                <span className="bg-[#C8952A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">UAM</span>
              </div>
              <p className="text-[#A8C4E0] text-xs font-medium">{perfil?.nombre}</p>
              <p className="text-[#A8C4E0] text-xs">
                CIF: <span className="font-mono font-bold text-[#C8952A]">{perfil?.cif ?? '—'}</span>
              </p>
            </div>
            <button onClick={async () => { await signOut(); navigate('/') }}
              className="text-[#A8C4E0] hover:text-white text-xs font-semibold transition-colors border border-[#0A3D7C] px-3 py-1.5 rounded-lg hover:border-[#A8C4E0]">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Turno activo */}
        {turnoActivo && cfg && (
          <div className={`rounded-2xl border-2 ${cfg.card} p-5 shadow-sm`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${cfg.badge}`}>
                {cfg.icon} {cfg.label}
              </span>
              <span className="text-xs text-slate-500 font-medium">{turno.departamentos?.nombre}</span>
            </div>

            <div className="text-center mb-4">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-1">Tu número de turno</p>
              <p className="text-7xl font-black text-[#002855] leading-none tracking-tight font-mono">
                {turno.codigo_turno}
              </p>
            </div>

            {turno.estado === 'pendiente' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3 text-center border border-slate-100 shadow-sm">
                    <p className="text-3xl font-black text-[#002855]">{turno.posicion_en_cola ?? '—'}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Posición en cola</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center border border-slate-100 shadow-sm">
                    <p className="text-3xl font-black text-[#C8952A]">{turno.tiempo_espera_min ?? '—'}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Minutos aprox.</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 text-center font-medium">
                  Esta pantalla se actualiza automáticamente en tiempo real
                </p>
                <button onClick={cancelarTurno}
                  className="w-full py-2.5 border-2 border-red-300 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors">
                  Cancelar turno
                </button>
              </div>
            )}

            {turno.estado === 'en_curso' && (
              <div className="space-y-3">
                <div className="bg-white rounded-xl p-4 text-center border-2 border-blue-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Dirígete a</p>
                  <p className="text-[#002855] font-black text-2xl">{turno.ventanillas?.nombre ?? 'Ventanilla asignada'}</p>
                  <p className="text-slate-400 text-sm mt-1">El funcionario te está esperando</p>
                </div>
                <p className="text-xs text-blue-600 text-center font-bold animate-pulse">
                  🔔 ¡Preséntate ahora!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Turno finalizado / cancelado */}
        {turnoFin && cfg && !mostrarNuevo && (
          <div className={`rounded-xl border ${cfg.card} p-4 flex items-center justify-between shadow-sm`}>
            <div>
              <p className="font-bold text-sm text-slate-700">
                {cfg.icon} Turno <span className="font-mono">{turno.codigo_turno}</span> — {cfg.label}
              </p>
              <p className="text-slate-400 text-xs mt-0.5">{turno.departamentos?.nombre}</p>
            </div>
            <button onClick={() => setMostrarNuevo(true)}
              className="text-sm font-bold text-[#002855] hover:text-[#C8952A] transition-colors">
              Nuevo turno →
            </button>
          </div>
        )}

        {/* Selector de departamentos */}
        {(!turnoActivo && (!turnoFin || mostrarNuevo)) && (
          <SeleccionDept
            departamentos={departamentos}
            solicitarTurno={solicitarTurno}
            solicitando={solicitando}
            error={errorSolicitud}
          />
        )}

      </main>
    </div>
  )
}