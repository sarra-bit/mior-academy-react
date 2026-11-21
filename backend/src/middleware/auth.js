const jwt = require('jsonwebtoken');

// Vérifie le token JWT envoyé dans l'en-tête "Authorization: Bearer <token>"
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentification requise.' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Session expirée, veuillez vous reconnecter.' });
  }
}

// Autorise seulement certains rôles : requireRole('admin'), requireRole('admin', 'formateur')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
