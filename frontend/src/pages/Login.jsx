import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [motdepasse, setMotdepasse] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/espace" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), motdepasse);
      navigate(location.state?.from || '/espace', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth">
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">Espace personnel</span>
        <h1 className="section-title">Se connecter</h1>
        <p className="muted">Accédez à vos sessions, attestations et messages.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <label>
          Adresse e-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Mot de passe
          <input type="password" value={motdepasse} onChange={(e) => setMotdepasse(e.target.value)} required autoComplete="current-password" />
        </label>

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
        <p className="auth-switch">
          Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
        </p>
      </form>
    </section>
  );
}
