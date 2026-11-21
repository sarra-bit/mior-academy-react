import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import useFlash from '../../utils/useFlash.jsx';
import { formatHeure } from '../../utils/format.js';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const VIDE = { jour: 'Lundi', heure_debut: '09:00', heure_fin: '12:00', statut: 'Disponible' };

export default function FormateurDisponibilites() {
  const [items, setItems] = useState(null);
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState('');
  const { ok, fail, Flash } = useFlash();

  const load = () => api.formateur.get('/disponibilites').then(setItems).catch((e) => fail(e.message));
  useEffect(() => { load(); }, []);

  const ouvrir = (d, jour) => {
    setErr('');
    setEdit(d ? { ...d, heure_debut: formatHeure(d.heure_debut), heure_fin: formatHeure(d.heure_fin) } : { ...VIDE, jour: jour || 'Lundi' });
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const r = edit.id ? await api.formateur.put(`/disponibilites/${edit.id}`, edit) : await api.formateur.post('/disponibilites', edit);
      ok(r.message);
      setEdit(null);
      load();
    } catch (e2) { setErr(e2.message); }
  };

  const supprimer = async (d) => {
    if (!window.confirm(`Supprimer le créneau du ${d.jour} ${formatHeure(d.heure_debut)}–${formatHeure(d.heure_fin)} ?`)) return;
    try { ok((await api.formateur.del(`/disponibilites/${d.id}`)).message); load(); } catch (e) { fail(e.message); }
  };

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="section-title">Mes disponibilités</h1>
          <p className="muted">L’administration ne peut planifier une session que sur un créneau où vous êtes disponible.</p>
        </div>
        <button className="btn btn-gold" onClick={() => ouvrir(null)}>+ Ajouter un créneau</button>
      </div>
      <Flash />

      {!items ? <div className="page-state">Chargement…</div> : (
        <div className="week">
          {JOURS.map((j) => {
            const creneaux = items.filter((d) => d.jour === j);
            return (
              <div key={j} className="week-day">
                <div className="week-head">
                  <strong>{j}</strong>
                  <button className="link-btn" onClick={() => ouvrir(null, j)} aria-label={`Ajouter un créneau le ${j}`}>+</button>
                </div>
                {creneaux.length === 0 && <p className="muted small">—</p>}
                {creneaux.map((d) => (
                  <div key={d.id} className={`slot ${d.statut === 'Disponible' ? 'slot-ok' : 'slot-off'}`}>
                    <strong>{formatHeure(d.heure_debut)} – {formatHeure(d.heure_fin)}</strong>
                    <span className="small">{d.statut}</span>
                    <div className="slot-actions">
                      <button className="link-btn" onClick={() => ouvrir(d)}>Modifier</button>
                      <button className="link-btn danger" onClick={() => supprimer(d)}>Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {edit && (
        <Modal title={edit.id ? 'Modifier le créneau' : 'Nouveau créneau'} onClose={() => setEdit(null)}>
          <form className="form-panel" onSubmit={enregistrer}>
            {err && <div className="alert alert-error">{err}</div>}
            <div className="form-grid">
              <label>
                Jour
                <select value={edit.jour} onChange={(e) => setEdit({ ...edit, jour: e.target.value })}>{JOURS.map((j) => <option key={j}>{j}</option>)}</select>
              </label>
              <label>
                Statut
                <select value={edit.statut} onChange={(e) => setEdit({ ...edit, statut: e.target.value })}>
                  <option>Disponible</option><option>Indisponible</option>
                </select>
              </label>
              <label>Début<input type="time" value={edit.heure_debut} onChange={(e) => setEdit({ ...edit, heure_debut: e.target.value })} required /></label>
              <label>Fin<input type="time" value={edit.heure_fin} onChange={(e) => setEdit({ ...edit, heure_fin: e.target.value })} required /></label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-light" onClick={() => setEdit(null)}>Annuler</button>
              <button className="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
