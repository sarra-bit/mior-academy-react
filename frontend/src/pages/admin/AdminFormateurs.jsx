import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import useFlash from '../../utils/useFlash.jsx';
import { DEPARTEMENTS_LISTE } from '../../utils/constants.js';

const VIDE = { nom: '', prenom: '', email: '', telephone: '', sexe: '', specialite: 'Informatique', motdepasse: '' };

export default function AdminFormateurs() {
  const [items, setItems] = useState(null);
  const [formations, setFormations] = useState([]);
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const [affect, setAffect] = useState(null); // { formateur, ids:Set }
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { ok, fail, Flash } = useFlash();

  const load = () => api.admin.get('/formateurs').then(setItems).catch((e) => fail(e.message));
  useEffect(() => {
    load();
    api.admin.get('/formations').then(setFormations).catch(() => {});
  }, []);

  const visibles = (items || []).filter((f) => !q || `${f.nom} ${f.prenom} ${f.email} ${f.specialite}`.toLowerCase().includes(q.toLowerCase()));
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.value });

  const ouvrir = (f) => {
    setErr('');
    setEdit(f ? { ...VIDE, ...f, sexe: f.sexe || '', telephone: f.telephone || '', motdepasse: '' } : { ...VIDE });
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (edit.id) await api.admin.put(`/formateurs/${edit.id}`, edit);
      else await api.admin.post('/formateurs', edit);
      ok(edit.id ? 'Formateur modifié.' : 'Formateur créé. Il peut se connecter avec son e-mail et le mot de passe choisi.');
      setEdit(null);
      load();
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  const supprimer = async (f) => {
    const extra = f.sessions_a_venir ? `\n${f.sessions_a_venir} session(s) à venir n’auront plus de formateur.` : '';
    if (!window.confirm(`Supprimer le formateur ${f.prenom} ${f.nom} et son compte ?${extra}`)) return;
    try { ok((await api.admin.del(`/formateurs/${f.id}`)).message); load(); } catch (e) { fail(e.message); }
  };

  const toggleStatut = async (f) => {
    try { ok((await api.admin.patch(`/comptes/${f.compte_id}/statut`, { statut: f.statut ? 0 : 1 })).message); load(); } catch (e) { fail(e.message); }
  };

  const enregistrerAffectations = async () => {
    setBusy(true);
    try {
      ok((await api.admin.put(`/formateurs/${affect.formateur.id}/formations`, { formation_ids: [...affect.ids] })).message);
      setAffect(null);
      load();
    } catch (e) { fail(e.message); } finally { setBusy(false); }
  };

  const toggleId = (id) => {
    const ids = new Set(affect.ids);
    ids.has(id) ? ids.delete(id) : ids.add(id);
    setAffect({ ...affect, ids });
  };

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="section-title">Formateurs</h1>
          <p className="muted">{items ? `${items.length} formateurs` : 'Chargement…'}</p>
        </div>
        <button className="btn btn-gold" onClick={() => ouvrir(null)}>+ Nouveau formateur</button>
      </div>
      <Flash />

      <div className="toolbar">
        <input type="search" placeholder="Rechercher un formateur…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un formateur" />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Formateur</th><th>Spécialité</th><th>Téléphone</th><th>Formations</th><th>Sessions à venir</th><th>Statut</th><th /></tr></thead>
          <tbody>
            {visibles.map((f) => (
              <tr key={f.id}>
                <td><strong>{f.prenom} {f.nom}</strong><div className="muted small">{f.email}</div></td>
                <td>{f.specialite}</td>
                <td>{f.telephone || '—'}</td>
                <td>
                  <button className="link-btn" onClick={() => setAffect({ formateur: f, ids: new Set(f.formation_ids) })}>
                    {f.nb_formations} formation{f.nb_formations > 1 ? 's' : ''} ✎
                  </button>
                </td>
                <td>{f.sessions_a_venir}</td>
                <td>
                  <button className={`switch ${f.statut ? 'on' : ''}`} onClick={() => toggleStatut(f)} aria-pressed={!!f.statut} title={f.statut ? 'Désactiver' : 'Activer'}>
                    {f.statut ? 'Actif' : 'Inactif'}
                  </button>
                </td>
                <td className="actions">
                  <button className="btn btn-light btn-sm" onClick={() => ouvrir(f)}>Modifier</button>
                  <button className="btn btn-danger btn-sm" onClick={() => supprimer(f)}>Supprimer</button>
                </td>
              </tr>
            ))}
            {items && visibles.length === 0 && <tr><td colSpan="7" className="muted center">Aucun formateur.</td></tr>}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal title={edit.id ? 'Modifier le formateur' : 'Nouveau formateur'} onClose={() => setEdit(null)}>
          <form className="form-panel" onSubmit={enregistrer}>
            {err && <div className="alert alert-error">{err}</div>}
            <div className="form-grid">
              <label>Nom<input value={edit.nom} onChange={set('nom')} required /></label>
              <label>Prénom<input value={edit.prenom} onChange={set('prenom')} required /></label>
              <label className="span-2">E-mail<input type="email" value={edit.email} onChange={set('email')} required /></label>
              <label>Téléphone<input value={edit.telephone} onChange={set('telephone')} required pattern="[0-9]{8}" inputMode="numeric" title="8 chiffres" /></label>
              <label>
                Sexe
                <select value={edit.sexe} onChange={set('sexe')}>
                  <option value="">—</option><option value="homme">Homme</option><option value="femme">Femme</option>
                </select>
              </label>
              <label className="span-2">
                Spécialité (département)
                <select value={DEPARTEMENTS_LISTE.find((d) => d.toLowerCase() === String(edit.specialite).toLowerCase()) || edit.specialite} onChange={set('specialite')} required>
                  {DEPARTEMENTS_LISTE.map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
              <label className="span-2">
                {edit.id ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'}
                <input type="password" minLength={6} value={edit.motdepasse} onChange={set('motdepasse')} required={!edit.id} autoComplete="new-password" />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-light" onClick={() => setEdit(null)}>Annuler</button>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>
          </form>
        </Modal>
      )}

      {affect && (
        <Modal title={`Formations de ${affect.formateur.prenom} ${affect.formateur.nom}`} onClose={() => setAffect(null)} wide>
          <p className="muted small" style={{ marginBottom: 12 }}>
            Cochez les formations que ce formateur peut animer. Les formations de son département ({affect.formateur.specialite}) sont affichées en premier.
          </p>
          <div className="check-groups">
            {[...DEPARTEMENTS_LISTE]
              .sort((a, b) => (b.toLowerCase() === String(affect.formateur.specialite).toLowerCase()) - (a.toLowerCase() === String(affect.formateur.specialite).toLowerCase()))
              .map((d) => {
                const liste = formations.filter((f) => f.departement === d);
                if (!liste.length) return null;
                return (
                  <fieldset key={d} className="check-group">
                    <legend>{d}</legend>
                    {liste.map((f) => (
                      <label key={f.id} className="check-line">
                        <input type="checkbox" checked={affect.ids.has(f.id)} onChange={() => toggleId(f.id)} />
                        {f.titre} <span className="muted small">{f.categorie}</span>
                      </label>
                    ))}
                  </fieldset>
                );
              })}
          </div>
          <div className="modal-actions">
            <span className="muted small">{affect.ids.size} sélectionnée(s)</span>
            <button className="btn btn-light" onClick={() => setAffect(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={enregistrerAffectations} disabled={busy}>Enregistrer</button>
          </div>
        </Modal>
      )}
    </>
  );
}
