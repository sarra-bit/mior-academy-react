import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import useFlash from '../../utils/useFlash.jsx';
import { formatDate, formatHeure } from '../../utils/format.js';
import { STATUTS_SESSION } from '../../utils/constants.js';

const VIDE = { formation_id: '', formateur_id: '', date_session: '', heure_debut: '09:00', heure_fin: '12:00', salle: '', nb_places: 20, statut: 'Planifiée' };
const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const STATUT_CLS = { 'Planifiée': 'tag-info', 'En cours': 'tag-live', 'Terminée': '', 'Annulée': 'tag-full' };
const norm = (s) => String(s || '').trim().toLowerCase();

export default function AdminSessions() {
  const [periode, setPeriode] = useState('avenir');
  const [items, setItems] = useState(null);
  const [opts, setOpts] = useState({ formations: [], formateurs: [] });
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { ok, fail, Flash } = useFlash();

  const load = () => {
    setItems(null);
    api.admin.get(`/sessions?periode=${periode}`).then(setItems).catch((e) => fail(e.message));
  };
  useEffect(load, [periode]);
  useEffect(() => { api.admin.get('/sessions/options').then(setOpts).catch(() => {}); }, []);

  const formation = opts.formations.find((f) => f.id === Number(edit?.formation_id));
  // Seuls les formateurs dont la spécialité = département de la formation (règle métier)
  const formateursOk = formation ? opts.formateurs.filter((f) => norm(f.specialite) === norm(formation.departement)) : [];
  const formateur = opts.formateurs.find((f) => f.id === Number(edit?.formateur_id));
  const jour = edit?.date_session ? JOURS[new Date(`${edit.date_session}T00:00:00`).getDay()] : '';

  const set = (k) => (e) => {
    const v = e.target.value;
    const next = { ...edit, [k]: v };
    if (k === 'formation_id') {
      const f = opts.formations.find((x) => x.id === Number(v));
      next.formateur_id = '';
      if (f && !edit.id) next.nb_places = f.nb_places;
    }
    setEdit(next);
  };

  const ouvrir = (s) => {
    setErr('');
    setEdit(s ? { ...VIDE, ...s, heure_debut: formatHeure(s.heure_debut), heure_fin: formatHeure(s.heure_fin), formateur_id: s.formateur_id || '' } : { ...VIDE });
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const r = edit.id ? await api.admin.put(`/sessions/${edit.id}`, edit) : await api.admin.post('/sessions', edit);
      ok(r.message);
      setEdit(null);
      load();
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  const supprimer = async (s) => {
    const msg = `Supprimer la session « ${s.titre} » du ${formatDate(s.date_session)} ?`
      + (s.nb_inscriptions ? `\n\nAttention : ses ${s.nb_inscriptions} inscription(s), groupes, présences et attestations seront aussi supprimés.` : '');
    if (!window.confirm(msg)) return;
    try { ok((await api.admin.del(`/sessions/${s.id}`)).message); load(); } catch (e) { fail(e.message); }
  };

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="section-title">Sessions</h1>
          <p className="muted">Planifiez les sessions, puis organisez les participants en groupes.</p>
        </div>
        <button className="btn btn-gold" onClick={() => ouvrir(null)}>+ Planifier une session</button>
      </div>
      <Flash />

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={periode === 'avenir'} className={periode === 'avenir' ? 'active' : ''} onClick={() => setPeriode('avenir')}>À venir</button>
        <button role="tab" aria-selected={periode === 'passees'} className={periode === 'passees' ? 'active' : ''} onClick={() => setPeriode('passees')}>Passées</button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Date</th><th>Formation</th><th>Formateur</th><th>Salle</th><th>Places</th><th>Inscriptions</th><th>Statut</th><th /></tr></thead>
          <tbody>
            {(items || []).map((s) => (
              <tr key={s.id}>
                <td><strong>{formatDate(s.date_session)}</strong><div className="muted small">{formatHeure(s.heure_debut)} – {formatHeure(s.heure_fin)}</div></td>
                <td><strong>{s.titre}</strong><div className="muted small">{s.departement}</div></td>
                <td>{s.formateur_nom ? `${s.formateur_prenom} ${s.formateur_nom}` : <span className="tag tag-full">Aucun</span>}</td>
                <td>{s.salle || '—'}</td>
                <td>{s.nb_places - s.nb_places_restantes} / {s.nb_places}</td>
                <td>
                  {s.nb_inscriptions}
                  {s.nb_en_attente > 0 && <Link to="/admin/inscriptions?statut=en_attente" className="tag tag-wait" style={{ marginLeft: 6 }}>{s.nb_en_attente} en attente</Link>}
                </td>
                <td><span className={`tag ${STATUT_CLS[s.statut] || ''}`}>{s.statut}</span></td>
                <td className="actions">
                  <Link to={`/admin/sessions/${s.id}/groupes`} className="btn btn-light btn-sm">Groupes ({s.nb_groupes})</Link>
                  <button className="btn btn-light btn-sm" onClick={() => ouvrir(s)}>Modifier</button>
                  <button className="btn btn-danger btn-sm" onClick={() => supprimer(s)}>Supprimer</button>
                </td>
              </tr>
            ))}
            {items && items.length === 0 && (
              <tr><td colSpan="8" className="muted center">{periode === 'avenir' ? 'Aucune session à venir. Cliquez sur « Planifier une session ».' : 'Aucune session passée.'}</td></tr>
            )}
            {!items && <tr><td colSpan="8" className="muted center">Chargement…</td></tr>}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal title={edit.id ? 'Modifier la session' : 'Planifier une session'} onClose={() => setEdit(null)} wide>
          <form className="form-panel" onSubmit={enregistrer}>
            {err && <div className="alert alert-error">{err}</div>}
            <div className="form-grid">
              <label className="span-2">
                Formation
                <select value={edit.formation_id} onChange={set('formation_id')} required>
                  <option value="">Choisir une formation</option>
                  {[...new Set(opts.formations.map((f) => f.departement))].map((d) => (
                    <optgroup key={d} label={d}>
                      {opts.formations.filter((f) => f.departement === d).map((f) => <option key={f.id} value={f.id}>{f.titre}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="span-2">
                Formateur {formation && <span className="muted small">(spécialité « {formation.departement} »)</span>}
                <select value={edit.formateur_id} onChange={set('formateur_id')} required disabled={!formation}>
                  <option value="">{formation ? (formateursOk.length ? 'Choisir un formateur' : 'Aucun formateur pour ce département') : 'Choisissez d’abord une formation'}</option>
                  {formateursOk.map((f) => <option key={f.id} value={f.id}>{f.prenom} {f.nom}</option>)}
                </select>
              </label>
              {formateur && (
                <div className="span-2 dispo-box">
                  <strong>Disponibilités de {formateur.prenom} :</strong>{' '}
                  {formateur.disponibilites.length
                    ? formateur.disponibilites.map((d, i) => (
                      <span key={i} className={`tag ${d.jour === jour ? 'tag-live' : ''}`}>{d.jour} {formatHeure(d.heure_debut)}–{formatHeure(d.heure_fin)}</span>
                    ))
                    : <span className="muted">aucune disponibilité saisie — la session ne pourra pas être planifiée.</span>}
                </div>
              )}
              <label>Date{jour && <span className="muted small"> ({jour})</span>}<input type="date" value={edit.date_session} onChange={set('date_session')} required /></label>
              <label>Salle<input value={edit.salle} onChange={set('salle')} required placeholder="ex. Salle A" /></label>
              <label>Heure de début<input type="time" value={edit.heure_debut} onChange={set('heure_debut')} required /></label>
              <label>Heure de fin<input type="time" value={edit.heure_fin} onChange={set('heure_fin')} required /></label>
              <label>Nombre de places<input type="number" min="1" value={edit.nb_places} onChange={set('nb_places')} required /></label>
              <label>
                Statut
                <select value={edit.statut} onChange={set('statut')}>{STATUTS_SESSION.map((s) => <option key={s}>{s}</option>)}</select>
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-light" onClick={() => setEdit(null)}>Annuler</button>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Vérification…' : edit.id ? 'Enregistrer' : 'Planifier'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
