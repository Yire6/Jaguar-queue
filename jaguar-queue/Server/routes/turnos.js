const express  = require('express');
const router   = express.Router();
const supabase = require('../supabase');

// ── Utilidad: calcula posición y tiempo estimado ────────────────
async function calcularPosicion(departamento_id, numero_turno, tiempo_prom_min) {
  const { count } = await supabase
    .from('turnos')
    .select('*', { count: 'exact', head: true })
    .eq('departamento_id', departamento_id)
    .eq('estado', 'pendiente')
    .lt('numero_turno', numero_turno);

  const posicion        = (count || 0) + 1;
  const tiempo_espera_min = (count || 0) * tiempo_prom_min;
  return { posicion_en_cola: posicion, tiempo_espera_min };
}

// ── POST /api/turnos ────────────────────────────────────────────
// Crear un nuevo turno para un estudiante
router.post('/', async (req, res) => {
  try {
    const { estudiante_id, departamento_id } = req.body;

    if (!estudiante_id || !departamento_id) {
      return res.status(400).json({
        success: false,
        error: 'estudiante_id y departamento_id son requeridos'
      });
    }

    // Verificar turno activo existente en este departamento
    const { data: turnoExistente } = await supabase
      .from('turnos')
      .select('id, codigo_turno, estado')
      .eq('estudiante_id', estudiante_id)
      .eq('departamento_id', departamento_id)
      .in('estado', ['pendiente', 'en_curso'])
      .maybeSingle();

    if (turnoExistente) {
      return res.status(409).json({
        success: false,
        error: 'Ya tienes un turno activo en este departamento',
        turno: turnoExistente
      });
    }

    // Insertar — los triggers de BD asignan numero_turno y codigo_turno
    const { data, error } = await supabase
      .from('turnos')
      .insert({ estudiante_id, departamento_id })
      .select(`
        *,
        departamentos (nombre, tiempo_prom_min),
        usuarios      (nombre, cif)
      `)
      .single();

    if (error) throw error;

    const { posicion_en_cola, tiempo_espera_min } = await calcularPosicion(
      departamento_id,
      data.numero_turno,
      data.departamentos.tiempo_prom_min
    );

    res.status(201).json({
      success: true,
      data: { ...data, posicion_en_cola, tiempo_espera_min }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/turnos/cola/:departamento_id ───────────────────────
// Vista del admin: cola completa de un departamento
router.get('/cola/:departamento_id', async (req, res) => {
  try {
    const { departamento_id } = req.params;

    const { data, error } = await supabase
      .from('turnos')
      .select(`
        *,
        usuarios    (nombre, cif, email),
        ventanillas (nombre, numero),
        departamentos (nombre, tiempo_prom_min)
      `)
      .eq('departamento_id', departamento_id)
      .in('estado', ['pendiente', 'en_curso'])
      .order('numero_turno', { ascending: true });

    if (error) throw error;

    // Numerar posición de cada pendiente
    let posicionCounter = 1;
    const dataConPosicion = data.map((turno) => ({
      ...turno,
      posicion_en_cola: turno.estado === 'pendiente' ? posicionCounter++ : null
    }));

    res.json({ success: true, data: dataConPosicion, total: data.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/turnos/estudiante/:estudiante_id ───────────────────
// Turno activo de un estudiante (pendiente o en_curso)
router.get('/estudiante/:estudiante_id', async (req, res) => {
  try {
    const { estudiante_id } = req.params;

    const { data: turno, error } = await supabase
      .from('turnos')
      .select(`
        *,
        departamentos (nombre, tiempo_prom_min),
        ventanillas   (nombre, numero)
      `)
      .eq('estudiante_id', estudiante_id)
      .in('estado', ['pendiente', 'en_curso'])
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error) throw error;
    if (!turno) return res.json({ success: true, data: null });

    let posicion_en_cola  = null;
    let tiempo_espera_min = null;

    if (turno.estado === 'pendiente') {
      const resultado = await calcularPosicion(
        turno.departamento_id,
        turno.numero_turno,
        turno.departamentos.tiempo_prom_min
      );
      posicion_en_cola  = resultado.posicion_en_cola;
      tiempo_espera_min = resultado.tiempo_espera_min;
    }

    res.json({ success: true, data: { ...turno, posicion_en_cola, tiempo_espera_min } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /api/turnos/:id/llamar ────────────────────────────────
// Admin llama al siguiente turno: pendiente → en_curso
router.patch('/:id/llamar', async (req, res) => {
  try {
    const { id }                    = req.params;
    const { ventanilla_id, admin_id } = req.body;

    if (!ventanilla_id) {
      return res.status(400).json({ success: false, error: 'ventanilla_id es requerido' });
    }

    const { data, error } = await supabase
      .from('turnos')
      .update({
        estado:       'en_curso',
        ventanilla_id,
        llamado_at:   new Date().toISOString()
      })
      .eq('id', id)
      .eq('estado', 'pendiente')
      .select(`
        *,
        usuarios    (nombre, cif),
        ventanillas (nombre, numero),
        departamentos (nombre)
      `)
      .single();

    if (error) throw error;

    // Asociar admin a la ventanilla
    if (admin_id) {
      await supabase
        .from('ventanillas')
        .update({ admin_id })
        .eq('id', ventanilla_id);
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /api/turnos/:id/finalizar ────────────────────────────
// Admin finaliza atención: en_curso → finalizado
router.patch('/:id/finalizar', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('turnos')
      .update({
        estado:        'finalizado',
        finalizado_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('estado', 'en_curso')
      .select('*')
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /api/turnos/:id/cancelar ─────────────────────────────
// Estudiante o admin cancela un turno
router.patch('/:id/cancelar', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('turnos')
      .update({ estado: 'cancelado' })
      .eq('id', id)
      .in('estado', ['pendiente', 'en_curso'])
      .select('*')
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;