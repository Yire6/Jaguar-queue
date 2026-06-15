const express  = require('express');
const router   = express.Router();
const supabase = require('../supabase');

// GET /api/ventanillas/:departamento_id — ventanillas activas de un departamento
router.get('/:departamento_id', async (req, res) => {
  try {
    const { departamento_id } = req.params;

    const { data, error } = await supabase
      .from('ventanillas')
      .select('*, usuarios(nombre)')
      .eq('departamento_id', departamento_id)
      .eq('activo', true)
      .order('numero');

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;