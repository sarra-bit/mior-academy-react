const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// --- Endpoints techniques ---------------------------------------------
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'UP', database: 'UP' });
  } catch {
    res.status(503).json({ status: 'DOWN', database: 'DOWN' });
  }
});

app.get('/version', (req, res) => {
  res.json({ version: process.env.APP_VERSION || '1.0.0' });
});

// --- API ----------------------------------------------------------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/formations', require('./routes/formations'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/inscriptions', require('./routes/inscriptions'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/formateur', require('./routes/formateur'));
app.use('/api/attestations', require('./routes/attestations'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/alertes', require('./routes/alertes'));

app.use('/api', (req, res) => res.status(404).json({ message: 'Route introuvable.' }));

// --- Gestion des erreurs -----------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Corps de requête JSON invalide.' });
  }
  console.error(err);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
});

module.exports = app;
