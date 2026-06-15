import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const { perfil, signOut }     = useAuth()
  const navigate                = useNavigate()
  const [departamentos, setDepartamentos] = useState([])
  const [ventanillas,   setVentanillas]   = useState([])
  const [deptSel,       setDeptSel]       = useState(null)
  const [ventId,        setVentId]        = useState('')
  const [cola,          setCola]          = useState([])
  const [cargando,      setCargando]      = useState(false)
  const [configurado,   setConfigurado]   = useState(false)

  useEffect(() => {
    api.getDepartamentos().then(r => { if (r.success) setDepartamentos(r.data) })
  }, [])

  const fetchCola = useCallback(async () => {
    if (!deptSel) return
    const r = await api.getCola(deptSel.id)
    if (r.success) setCola(r.data)
  }, [deptSel])

  useEffect(() => {
    if (!deptSel) return
    fetchCola()
    const ch = supabase
      .channel(`cola-${deptSel.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'turnos',
        filter: `departamento_id=eq.${deptSel.id}`
      }, () => fetchCola())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [deptSel, fetchCola])

  const selDept = async (dept) => {
    setDeptSel(dept); setVentId('')
    const r = await api.getVentanillas(dept.id)
    if (r.success) setVentanillas(r.data)
  }

  const turnoEnCurso = cola.find(t => t.estado === 'en_curso')
  const pendientes   = cola.filter(t => t.estado === 'pendiente')

  const llamarSiguiente = async () => {
    if (!pendientes.length) return
    setCargando(true)
    await api.llamarTurno(pendientes[0].id, ventId, perfil?.id)
    await fetchCola()
    setCargando(false)
  }

  const finalizar = async () => {
    if (!turnoEnCurso) return
    setCargando(true)
    await api.finalizarTurno(turnoEnCurso.id)
    await fetchCola()
    setCargando(false)
  }

  // ── Pantalla de configuración inicial ──
  if (!configurado) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl">🛡️</span>
          <h1 className="text-white font-black text-xl mt-3">Configurar sesión</h1>
          <p className="text-slate-400 text-sm mt-1">Selecciona tu departamento y ventanilla</p>
        </div>

        <div className="bg-white rounded-2xl p-6 space-y-5">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Departamento</p>
            <div className="space-y-2">
              {departamentos.map(d => (
                <button key={d.id} onClick={() => selDept(d)}
                  className={`w-full p-3.5 rounded-xl border text-left text-sm font-semibold transition-all ${
                    deptSel?.id === d.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}>
                  {d.nombre}
                  <span className="float-right text-xs font-normal text-gray-400">{d.prefijo_turno}-XXX</span>
                </button>
              ))}
            </div>
          </div>

          {ventanillas.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mi ventanilla</p>
              <div className="space-y-2">
                {ventanillas.map(v => (
                  <button key={v.id} onClick={() => setVentId(v.id)}
                    className={`w-full p-3.5 rounded-xl border text-left text-sm font-semibold transition-all ${
                      ventId === v.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}>
                    {v.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => setConfigurado(true)}
            disabled={!deptSel || !ventId}
            className="w-full py-3.5 bg-blue-600 disabled:bg-gray-200 text-white disabled:text-gray-400 font-bold rounded-xl transition-colors text-sm">
            Comenzar atención →
          </button>
        </div>
      </div>
    </div>
  )

  // ── Dashboard activo ──
  const ventNombre = ventanillas.find(v => v.id === ventId)?.nombre ?? ''

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-800 text-white px-4 py-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="font-bold text-base">{deptSel?.nombre}</p>
            <p className="text-slate-400 text-xs">{ventNombre} · {perfil?.nombre}</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => { setConfigurado(false); setCola([]) }}
              className="text-slate-400 hover:text-white text-xs transition-colors">Cambiar</button>
            <button onClick={async () => { await signOut(); navigate('/admin') }}
              className="text-slate-400 hover:text-white text-xs transition-colors">Salir →</button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-4xl font-black text-slate-800">{pendientes.length}</p>
            <p className="text-slate-500 text-sm mt-1">En espera</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className={`text-4xl font-black ${turnoEnCurso ? 'text-blue-600' : 'text-slate-300'}`}>
              {turnoEnCurso?.codigo_turno ?? '—'}
            </p>
            <p className="text-slate-500 text-sm mt-1">Atendiendo</p>
          </div>
        </div>

        {/* Turno en curso */}
        {turnoEnCurso && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-5">
            <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-3">🔵 En atención</p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-4xl font-black text-blue-700">{turnoEnCurso.codigo_turno}</p>
                <p className="text-slate-700 font-semibold mt-1">{turnoEnCurso.usuarios?.nombre}</p>
                <p className="text-slate-400 text-sm">CIF: {turnoEnCurso.usuarios?.cif}</p>
              </div>
              <button onClick={finalizar} disabled={cargando}
                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white font-bold rounded-xl transition-colors text-sm shrink-0">
                ✅ Finalizar
              </button>
            </div>
          </div>
        )}

        {/* Llamar siguiente */}
        <button onClick={llamarSiguiente}
          disabled={cargando || pendientes.length === 0}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-base rounded-2xl transition-colors shadow-sm">
          {pendientes.length === 0
            ? '— Sin turnos en espera —'
            : `📢 Llamar siguiente — ${pendientes[0]?.codigo_turno}`}
        </button>

        {/* Lista de cola */}
        <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">
            Cola de espera ({pendientes.length})
          </p>
          <div className="space-y-2">
            {pendientes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <p className="text-slate-300 text-4xl mb-2">🎉</p>
                <p className="text-slate-400 text-sm">No hay turnos pendientes</p>
              </div>
            ) : pendientes.map((t, i) => (
              <div key={t.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-slate-300 w-5 text-center">#{i + 1}</span>
                  <div>
                    <p className="font-black text-slate-800">{t.codigo_turno}</p>
                    <p className="text-slate-500 text-sm">{t.usuarios?.nombre}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full shrink-0">
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