import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

const ESTADO = {
  pendiente:  { label: 'En espera',  bg: 'bg-amber-50',   border: 'border-amber-300',  text: 'text-amber-700',   icon: '⏳' },
  en_curso:   { label: '¡Tu turno!', bg: 'bg-blue-50',    border: 'border-blue-400',   text: 'text-blue-700',    icon: '🔔' },
  finalizado: { label: 'Finalizado', bg: 'bg-emerald-50', border: 'border-emerald-300',text: 'text-emerald-700', icon: '✅' },
  cancelado:  { label: 'Cancelado',  bg: 'bg-red-50',     border: 'border-red-300',    text: 'text-red-600',     icon: '❌' },
}

export default function StudentDashboard() {
  const { user, perfil, signOut } = useAuth()
  const navigate = useNavigate()
  const [turno,        setTurno]        = useState(null)
  const [departamentos,setDepartamentos] = useState([])
  const [cargando,     setCargando]     = useState(true)
  const [solicitando,  setSolicitando]  = useState(false)
  const [error,        setError]        = useState('')
  const [mostrarNuevo, setMostrarNuevo] = useState(false)

  const fetchTurno = useCallback(async () => {
    if (!user) return
    const res = await api.getTurnoEstudiante(user.id)
    if (res.success) setTurno(res.data)
  }, [user])

  useEffect(() => {
    const init = async () => {
      setCargando(true)
      const [dRes] = await Promise.all([api.getDepartamentos(), fetchTurno()])
      if (dRes.success) setDepartamentos(dRes.data)
      setCargando(false)
    }
    init()
  }, [fetchTurno])

  // Realtime — escucha cambios en el turno del estudiante
  useEffect(() => {
    if (!user) return
    const ch = supabase
      .channel(`turno-est-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'turnos',
        filter: `estudiante_id=eq.${user.id}`
      }, () => fetchTurno())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user, fetchTurno])

  const solicitarTurno = async (departamento_id) => {
    setSolicitando(true); setError('')
    const res = await api.crearTurno(user.id, departamento_id)
    if (res.success) { setTurno(res.data); setMostrarNuevo(false) }
    else setError(res.error)
    setSolicitando(false)
  }

  const cancelarTurno = async () => {
    if (!turno) return
    await api.cancelarTurno(turno.id)
    await fetchTurno()
  }

  if (cargando) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center"><p className="text-4xl mb-2">🐆</p><p className="text-slate-400 text-sm">Cargando tu turno...</p></div>
    </div>
  )

  const cfg = turno ? ESTADO[turno.estado] : null
  const turnoActivo = turno && ['pendiente', 'en_curso'].includes(turno.estado)
  const turnoTerminado = turno && ['finalizado', 'cancelado'].includes(turno.estado)

  const SeleccionDept = () => (
    <div>
      <h2 className="text-slate-800 font-bold text-lg mb-1">¿Qué trámite necesitas?</h2>
      <p className="text-slate-500 text-sm mb-4">Selecciona un departamento para obtener tu turno</p>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      <div className="space-y-3">
        {departamentos.map(dept => (
          <button key={dept.id} onClick={() => solicitarTurno(dept.id)}
            disabled={solicitando}
            className="w-full bg-white rounded-2xl border border-slate-200 p-5 text-left hover:border-blue-400 hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-50">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-base">{dept.nombre}</p>
                <p className="text-slate-500 text-sm mt-0.5 leading-tight">{dept.descripcion}</p>
              </div>
              <div className="text-right ml-4 shrink-0">
                <p className="text-3xl font-black text-blue-600 leading-none">{dept.turnos_activos}</p>
                <p className="text-xs text-slate-400 mt-0.5">en cola</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium">
                ~{dept.tiempo_prom_min} min por turno
              </span>
              <span className="text-xs text-slate-400">Turno: {dept.prefijo_turno}-XXX</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-700 text-white px-4 py-4 shadow-md sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🐆</span>
              <span className="font-bold">Jaguar Queue</span>
            </div>
            <p className="text-blue-200 text-xs mt-0.5 truncate max-w-[200px]">
              {perfil?.nombre} · CIF: {perfil?.cif ?? '—'}
            </p>
          </div>
          <button onClick={async () => { await signOut(); navigate('/') }}
            className="text-blue-200 hover:text-white text-sm transition-colors font-medium">
            Salir →
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Turno activo */}
        {turnoActivo && cfg && (
          <div className={`rounded-2xl border-2 ${cfg.border} ${cfg.bg} p-6`}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <span className={`text-xs font-bold uppercase tracking-widest ${cfg.text}`}>
                  {cfg.icon} {cfg.label}
                </span>
                <p className="text-slate-600 text-sm mt-1 font-medium">
                  {turno.departamentos?.nombre}
                </p>
              </div>
              <div className={`text-6xl font-black leading-none ${cfg.text}`}>
                {turno.codigo_turno}
              </div>
            </div>

            {turno.estado === 'pendiente' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-3xl font-black text-slate-800">{turno.posicion_en_cola ?? '—'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Posición en cola</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-3xl font-black text-slate-800">{turno.tiempo_espera_min ?? '—'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Min. estimados</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 text-center">
                  Esta pantalla se actualiza automáticamente
                </p>
                <button onClick={cancelarTurno}
                  className="w-full py-2.5 border border-red-300 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors">
                  Cancelar turno
                </button>
              </div>
            )}

            {turno.estado === 'en_curso' && (
              <div className="space-y-3">
                <div className="bg-white rounded-xl p-4 text-center border border-blue-200">
                  <p className="text-blue-700 font-black text-xl">
                    {turno.ventanillas?.nombre ?? 'Ventanilla asignada'}
                  </p>
                  <p className="text-slate-500 text-sm mt-1">Dirígete ahora</p>
                </div>
                <p className="text-xs text-blue-600 text-center font-semibold animate-pulse">
                  ¡El administrador te está esperando!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Turno finalizado / cancelado */}
        {turnoTerminado && cfg && !mostrarNuevo && (
          <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-4 flex items-center justify-between`}>
            <div>
              <p className={`font-bold text-sm ${cfg.text}`}>
                {cfg.icon} {turno.codigo_turno} — {cfg.label}
              </p>
              <p className="text-slate-500 text-xs">{turno.departamentos?.nombre}</p>
            </div>
            <button onClick={() => setMostrarNuevo(true)}
              className="text-sm text-blue-600 font-bold hover:underline">
              Nuevo turno
            </button>
          </div>
        )}

        {/* Selector de departamentos */}        {(!turnoActivo && (!turnoTerminado || mostrarNuevo)) && <SeleccionDept />}




      </main>
    </div>
  )
}