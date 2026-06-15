import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const { perfil, signOut }               = useAuth()
  const navigate                          = useNavigate()
  const [departamentos,  setDepartamentos]  = useState([])
  const [ventanillas,    setVentanillas]    = useState([])
  const [deptSel,        setDeptSel]        = useState(null)
  const [ventId,         setVentId]         = useState('')
  const [cola,           setCola]           = useState([])
  const [cargando,       setCargando]       = useState(false)
  const [configurado,    setConfigurado]    = useState(false)
  const [errorConexion,  setErrorConexion]  = useState('')

  // Carga departamentos al montar
  useEffect(() => {
    const cargar = async () => {
      try {
        const r = await api.getDepartamentos()
        if (r.success) setDepartamentos(r.data)
        else setErrorConexion('No se pudieron cargar los departamentos.')
      } catch {
        setErrorConexion('No se puede conectar con el servidor. Verifica que el backend esté corriendo en el puerto 3001.')
      }
    }
    cargar()
  }, [])

  // Carga cola cuando cambia el departamento
  useEffect(() => {
    if (!deptSel) return
    const cargarCola = async () => {
      const r = await api.getCola(deptSel.id)
      if (r.success) setCola(r.data)
    }
    cargarCola()
  }, [deptSel])

  // Suscripción Realtime independiente
  useEffect(() => {
    if (!deptSel) return
    const ch = supabase
      .channel(`cola-admin-${deptSel.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'turnos',
        filter: `departamento_id=eq.${deptSel.id}`,
      }, async () => {
        const r = await api.getCola(deptSel.id)
        if (r.success) setCola(r.data)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [deptSel])

  const selDept = async (dept) => {
    setDeptSel(dept); setVentId('')
    const r = await api.getVentanillas(dept.id)
    if (r.success) setVentanillas(r.data)
  }

  const turnoEnCurso = cola.find(t => t.estado === 'en_curso')
  const pendientes   = cola.filter(t => t.estado === 'pendiente')

  const llamarSiguiente = async () => {
    if (!pendientes.length || !ventId) return
    setCargando(true)
    await api.llamarTurno(pendientes[0].id, ventId, perfil?.id)
    setCargando(false)
  }

  const finalizar = async () => {
    if (!turnoEnCurso) return
    setCargando(true)
    await api.finalizarTurno(turnoEnCurso.id)
    setCargando(false)
  }

  const ventNombre = ventanillas.find(v => v.id === ventId)?.nombre ?? ''

  // ── Pantalla de error de conexión ──
  if (errorConexion && !configurado) return (
    <div className="min-h-screen bg-[#001A3D] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl">
        <p className="text-3xl mb-3">⚠️</p>
        <h2 className="font-bold text-slate-800 mb-2">Error de conexión</h2>
        <p className="text-slate-500 text-sm">{errorConexion}</p>
        <button onClick={() => window.location.reload()}
          className="mt-4 w-full py-2.5 bg-[#002855] text-white rounded-xl text-sm font-bold">
          Reintentar
        </button>
      </div>
    </div>
  )

  // ── Pantalla de configuración ──
  if (!configurado) return (
    <div className="min-h-screen bg-[#001A3D] flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#C8952A] rounded-2xl mb-3">
            <span className="text-2xl">🛡️</span>
          </div>
          <h1 className="text-white font-bold text-xl">Configurar sesión</h1>
          <p className="text-[#6B8CAE] text-sm mt-0.5">Selecciona tu puesto de atención</p>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-[#002855] px-5 py-3">
            <p className="text-white text-sm font-semibold">{perfil?.nombre}</p>
            <p className="text-[#A8C4E0] text-xs">Personal administrativo</p>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Departamento
              </p>
              {departamentos.length === 0 ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-2 border-[#002855] border-t-[#C8952A] rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-slate-400 text-xs">Cargando...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {departamentos.map(d => (
                    <button key={d.id} onClick={() => selDept(d)}
                      className={`w-full p-3.5 rounded-xl border-2 text-left text-sm font-semibold transition-all ${
                        deptSel?.id === d.id
                          ? 'border-[#002855] bg-[#F4F7FA] text-[#002855]'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}>
                      <span>{d.nombre}</span>
                      <span className={`float-right text-xs font-normal ${deptSel?.id === d.id ? 'text-[#C8952A]' : 'text-slate-400'}`}>
                        {d.prefijo_turno}-XXX
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {ventanillas.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Mi ventanilla
                </p>
                <div className="space-y-2">
                  {ventanillas.map(v => (
                    <button key={v.id} onClick={() => setVentId(v.id)}
                      className={`w-full p-3.5 rounded-xl border-2 text-left text-sm font-semibold transition-all ${
                        ventId === v.id
                          ? 'border-[#C8952A] bg-amber-50 text-[#8B6010]'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}>
                      {v.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => setConfigurado(true)}
              disabled={!deptSel || !ventId}
              className="w-full py-3.5 bg-[#002855] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl transition-all text-sm">
              Comenzar atención →
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Dashboard activo ──
  return (
    <div className="min-h-screen bg-[#F4F7FA]">

      {/* Header */}
      <header className="bg-[#002855] px-5 py-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-base">{deptSel?.nombre}</span>
              <span className="bg-[#C8952A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">UAM</span>
            </div>
            <p className="text-[#A8C4E0] text-xs mt-0.5">{ventNombre} · {perfil?.nombre}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { setConfigurado(false); setCola([]) }}
              className="text-[#A8C4E0] hover:text-white text-xs font-medium transition-colors border border-[#0A3D7C] px-2.5 py-1 rounded-lg">
              Cambiar
            </button>
            <button onClick={async () => { await signOut(); navigate('/admin') }}
              className="text-[#A8C4E0] hover:text-white text-xs font-medium transition-colors">
              Salir →
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
            <p className="text-4xl font-black text-[#002855]">{pendientes.length}</p>
            <p className="text-slate-500 text-xs font-semibold mt-1">En espera</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
            <p className={`text-3xl font-black font-mono ${turnoEnCurso ? 'text-[#C8952A]' : 'text-slate-200'}`}>
              {turnoEnCurso?.codigo_turno ?? '—'}
            </p>
            <p className="text-slate-500 text-xs font-semibold mt-1">Atendiendo</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
            <p className="text-4xl font-black text-slate-300">
              {pendientes[0]?.codigo_turno?.split('-')[1] ?? '—'}
            </p>
            <p className="text-slate-500 text-xs font-semibold mt-1">Siguiente</p>
          </div>
        </div>

        {/* Turno en curso */}
        {turnoEnCurso && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">En atención</p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-5xl font-black text-[#002855] font-mono leading-none">
                  {turnoEnCurso.codigo_turno}
                </p>
                <p className="text-slate-700 font-bold mt-2">{turnoEnCurso.usuarios?.nombre}</p>
                <p className="text-slate-400 text-sm font-mono">CIF: {turnoEnCurso.usuarios?.cif}</p>
              </div>
              <button onClick={finalizar} disabled={cargando}
                className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all text-sm shadow-sm shrink-0">
                ✓ Finalizar
              </button>
            </div>
          </div>
        )}

        {/* Botón llamar siguiente */}
        <button onClick={llamarSiguiente}
          disabled={cargando || pendientes.length === 0}
          className="w-full py-4 bg-[#002855] hover:bg-[#001A3D] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-base rounded-2xl transition-all shadow-sm flex items-center justify-center gap-3">
          {pendientes.length === 0
            ? 'No hay turnos pendientes'
            : (
              <>
                <span className="text-[#C8952A]">📢</span>
                Llamar siguiente —
                <span className="font-mono bg-white/20 px-2 py-0.5 rounded-lg">
                  {pendientes[0]?.codigo_turno}
                </span>
              </>
            )}
        </button>

        {/* Lista de cola */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Cola de espera
            </p>
            <span className="bg-[#002855] text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendientes.length}
            </span>
          </div>

          <div className="space-y-2">
            {pendientes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                <p className="text-3xl mb-2">✓</p>
                <p className="text-slate-400 text-sm font-medium">Cola vacía — sin turnos pendientes</p>
              </div>
            ) : pendientes.map((t, i) => (
              <div key={t.id}
                className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm hover:border-slate-300 transition-colors">
                <span className="w-7 h-7 rounded-full bg-[#F4F7FA] border border-slate-200 flex items-center justify-center text-xs font-black text-slate-400 shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-[#002855] font-mono text-base">{t.codigo_turno}</p>
                  <p className="text-slate-500 text-sm truncate">{t.usuarios?.nombre}</p>
                </div>
                <span className="text-xs text-slate-400 font-mono bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg shrink-0">
                  {t.usuarios?.cif}
                </span>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}