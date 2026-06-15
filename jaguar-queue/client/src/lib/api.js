const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const get   = (url)        => fetch(`${BASE}${url}`).then(r => r.json())
const post  = (url, body)  => fetch(`${BASE}${url}`, { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json())
const patch = (url, body)  => fetch(`${BASE}${url}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json())

export const api = {
  getDepartamentos:   ()                              => get('/api/departamentos'),
  getVentanillas:     (deptId)                        => get(`/api/ventanillas/${deptId}`),
  getCola:            (deptId)                        => get(`/api/turnos/cola/${deptId}`),
  getTurnoEstudiante: (estudianteId)                  => get(`/api/turnos/estudiante/${estudianteId}`),
  crearTurno:         (estudiante_id, departamento_id) => post('/api/turnos', { estudiante_id, departamento_id }),
  llamarTurno:        (id, ventanilla_id, admin_id)   => patch(`/api/turnos/${id}/llamar`, { ventanilla_id, admin_id }),
  finalizarTurno:     (id)                            => patch(`/api/turnos/${id}/finalizar`, {}),
  cancelarTurno:      (id)                            => patch(`/api/turnos/${id}/cancelar`, {}),
}