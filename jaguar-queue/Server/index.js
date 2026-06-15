const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const departamentosRouter = require('./routes/departamentos');
const ventanillasRouter   = require('./routes/ventanillas');
const turnosRouter        = require('./routes/turnos');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Rutas ──────────────────────────────────────────
app.use('/api/departamentos', departamentosRouter);
app.use('/api/ventanillas',   ventanillasRouter);
app.use('/api/turnos',        turnosRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Jaguar Queue API', timestamp: new Date().toISOString() });
});

// Handler global de errores
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`🐆 Jaguar Queue API · http://localhost:${PORT}`);
});