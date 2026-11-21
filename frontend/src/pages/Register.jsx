import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

import { DEPARTEMENTS_LISTE as SPECIALITES } from '../utils/constants.js';

const EMPTY = {
  nom: '', prenom: '', sexe: '', date_naissance: '', telephone: '', email: '',
  role: 'participant', specialite: '', motdepasse: '', confirm_motdepasse: '',
};

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/espace" replace />;

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.motdepasse !== form.confirm_motdepasse) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setBusy(true);
    try {
      await register(form);
      navigate('/espace', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth">
      <form className="auth-card auth-card-wide" onSubmit={submit}>
        <span className="eyebrow">Inscription</span>
        <h1 className="section-title">Créer un compte</h1>
        <p className="muted">Rejoignez M.I.O.R Academy en tant que participant ou formateur.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="role-switch" role="radiogroup" aria-label="Type de compte">
          {['participant', 'formateur'].map((r) => (
            <button
              type="button"
              key={r}
              role="radio"
              aria-checked={form.role === r}
              className={form.role === r ? 'active' : ''}
              onClick={() => setForm({ ...form, role: r })}
            >
              {r === 'participant' ? '🎓 Participant' : '👨‍🏫 Formateur'}
            </button>
          ))}
        </div>

        <div className="form-grid">
          <label>Nom<input value={form.nom} onChange={set('nom')} required /></label>
          <label>Prénom<input value={form.prenom} onChange={set('prenom')} required /></label>
          <label>
            Sexe
            <select value={form.sexe} onChange={set('sexe')}>
              <option value="">—</option>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
            </select>
          </label>
          <label>Date de naissance<input type="date" max="2010-12-31" value={form.date_naissance} onChange={set('date_naissance')} /></label>
          <label>
            Téléphone
            <input value={form.telephone} onChange={set('telephone')} required pattern="[0-9]{8}" inputMode="numeric" title="8 chiffres" placeholder="8 chiffres" />
          </label>
          <label>E-mail<input type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></label>
          {form.role === 'formateur' && (
            <label className="span-2">
              Spécialité
              <select value={form.specialite} onChange={set('specialite')} required>
                <option value="">Choisir une spécialité</option>
                {SPECIALITES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          )}
          <label>Mot de passe<input type="password" minLength={6} value={form.motdepasse} onChange={set('motdepasse')} required autoComplete="new-password" /></label>
          <label>Confirmer le mot de passe<input type="password" minLength={6} value={form.confirm_motdepasse} onChange={set('confirm_motdepasse')} required autoComplete="new-password" /></label>
        </div>

        <button className="btn btn-gold btn-block" disabled={busy}>
          {busy ? 'Création…' : 'Créer mon compte'}
        </button>
        <p className="auth-switch">
          Déjà inscrit ? <Link to="/connexion">Se connecter</Link>
        </p>
      </form>
    </section>
  );
}
