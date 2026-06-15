const express  = require('express');
const router   = express.Router();
const supabase = require('../supabase');

// GET /api/departamentos — lista departamentos activos con su cola actual
router.get('/', async (_req, res) => {
  try {
    const { data: departamentos, error } = await supabase
      .from('departamentos')
      .select('*')
      .eq('activo', true)
      .order('nombre');

    if (error) throw error;

    // Añadir conteo de turnos pendientes por departamento
    const conCola = await Promise.all(
      departamentos.map(async (dept) => {
        const { count } = await supabase
          .from('turnos')
          .select('*', { count: 'exact', head: true })
          .eq('departamento_id', dept.id)
          .in('estado', ['pendiente', 'en_curso']);

        return { ...dept, turnos_activos: count || 0 };
      })
    );

    res.json({ success: true, data: conCola });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;