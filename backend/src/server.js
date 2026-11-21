require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET manquant : copiez .env.example en .env et remplissez-le.');
  process.exit(1);
}

const app = require('./app');
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`API M.I.O.R Academy démarrée sur http://localhost:${PORT}`);
});
