import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate } from '../utils/format.js';
import { DEPARTEMENTS_LISTE } from '../utils/constants.js';

const ROLE_LABEL = { admin: 'Administrateur', formateur: 'Formateur', participant: 'Participant' };

export default function Profil() {
  const { setUser } = useAuth();
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  const [pwd, setPwd] = useState({ actuel: '', nouveau: '', confirmation: '' });
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });
  const [pwdBusy, setPwdBusy] = useState(false);

  useEffect(() => {
    api.profil()
      .then((p) => setForm({ ...p, sexe: p.sexe || '', date_naissance: p.date_naissance || '', telephone: p.telephone || '', specialite: p.specialite || '' }))
      .catch((e) => setMsg({ type: 'error', text: e.message }));
  }, []);

  if (!form) return <div className="page-state">{msg.text || 'Chargement…'}</div>;

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg({ type: '', text: '' });
    try {
      const p = await api.updateProfil(form);
      setUser((u) => ({ ...u, nom: p.nom, prenom: p.prenom, email: p.email, telephone: p.telephone }));
      setMsg({ type: 'success', text: 'Vos informations ont été enregistrées.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const savePwd = async (e) => {
    e.preventDefault();
    setPwdMsg({ type: '', text: '' });
    if (pwd.nouveau !== pwd.confirmation) {
      setPwdMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    setPwdBusy(true);
    try {
      const r = await api.changePassword(pwd);
      setPwd({ actuel: '', nouveau: '', confirmation: '' });
      setPwdMsg({ type: 'success', text: r.message });
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.message });
    } finally {
      setPwdBusy(false);
    }
  };

  return (
    <section className="block page">
      <Link to="/espace" className="back-link">← Mon espace</Link>
      <div className="profile-head">
        <span className="avatar avatar-lg">{form.prenom?.[0]}{form.nom?.[0]}</span>
        <div>
          <h1 className="section-title" style={{ marginBottom: 4 }}>{form.prenom} {form.nom}</h1>
          <p className="muted">{ROLE_LABEL[form.role]} · membre depuis le {formatDate(form.created_at?.slice(0, 10))}</p>
        </div>
      </div>

      <div className="dash-grid">
        <form className="panel form-panel" onSubmit={save}>
          <h3>Informations personnelles</h3>
          {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
          <div className="form-grid">
            <label>Nom<input value={form.nom} onChange={set('nom')} required /></label>
            <label>Prénom<input value={form.prenom} onChange={set('prenom')} required /></label>
            <label className="span-2">E-mail<input type="email" value={form.email} onChange={set('email')} required /></label>
            <label>Téléphone<input value={form.telephone} onChange={set('telephone')} required pattern="[0-9]{8}" inputMode="numeric" title="8 chiffres" /></label>
            <label>
              Sexe
              <select value={form.sexe} onChange={set('sexe')}>
                <option value="">—</option>
                <option value="homme">Homme</option>
                <option value="femme">Femme</option>
              </select>
            </label>
            <label>Date de naissance<input type="date" max="2010-12-31" value={form.date_naissance} onChange={set('date_naissance')} /></label>
            {form.role === 'formateur' && (
              <label>
                Spécialité
                <select value={DEPARTEMENTS_LISTE.find((d) => d.toLowerCase() === form.specialite.toLowerCase()) || form.specialite} onChange={set('specialite')}>
                  {DEPARTEMENTS_LISTE.map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
            )}
          </div>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        </form>

        <form className="panel form-panel" onSubmit={savePwd}>
          <h3>Mot de passe</h3>
          {pwdMsg.text && <div className={`alert alert-${pwdMsg.type}`}>{pwdMsg.text}</div>}
          <label>Mot de passe actuel<input type="password" value={pwd.actuel} onChange={(e) => setPwd({ ...pwd, actuel: e.target.value })} required autoComplete="current-password" /></label>
          <label>Nouveau mot de passe<input type="password" minLength={6} value={pwd.nouveau} onChange={(e) => setPwd({ ...pwd, nouveau: e.target.value })} required autoComplete="new-password" /></label>
          <label>Confirmer<input type="password" minLength={6} value={pwd.confirmation} onChange={(e) => setPwd({ ...pwd, confirmation: e.target.value })} required autoComplete="new-password" /></label>
          <button className="btn btn-light" disabled={pwdBusy}>{pwdBusy ? 'Modification…' : 'Changer le mot de passe'}</button>
        </form>
      </div>
    </section>
  );
}
