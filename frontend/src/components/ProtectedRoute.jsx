import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Redirige vers /connexion si l'utilisateur n'est pas connecté (ou n'a pas le bon rôle)
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="page-state">Chargement…</div>;
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/espace" replace />;
  return children;
}
