import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import useFlash from '../../utils/useFlash.jsx';
import { formatPrix } from '../../utils/format.js';
import { DEPARTEMENTS_LISTE } from '../../utils/constants.js';

const VIDE = {
  titre: '', description: '', duree: '', prix: '', competences: '', prerequis: '',
  departement: 'Informatique', categorie: '', type_paiement: 'complet', montant_avance: '', nb_places: 20,
};

export default function AdminFormations() {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('');
  const [edit, setEdit] = useState(null); // null = fermé, {} = nouveau, {id,...} = modification
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { ok, fail, Flash } = useFlash();

  const load = () => api.admin.get('/formations').then(setItems).catch((e) => fail(e.message));
  useEffect(() => { load(); }, []);

  const categories = useMemo(() => [...new Set((items || []).map((f) => f.categorie).filter(Boolean))].sort(), [items]);
  const visibles = (items || []).filter((f) =>
    (!dept || f.departement === dept) &&
    (!q || `${f.titre} ${f.categorie}`.toLowerCase().includes(q.toLowerCase()))
  );

  const ouvrir = (f) => {
    setErr('');
    setEdit(f ? Object.fromEntries(Object.entries({ ...VIDE, ...f }).map(([k, v]) => [k, v ?? ''])) : { ...VIDE });
  };
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.value });

  const enregistrer = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (edit.id) await api.admin.put(`/formations/${edit.id}`, edit);
      else await api.admin.post('/formations', edit);
      ok(edit.id ? 'Formation modifiée.' : 'Formation créée.');
      setEdit(null);
      load();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const supprimer = async (f) => {
    if (!window.confirm(`Supprimer la formation « ${f.titre} » ?`)) return;
    try {
      const r = await api.admin.del(`/formations/${f.id}`);
      ok(r.message);
      load();
    } catch (e) { fail(e.message); }
  };

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="section-title">Formations</h1>
          <p className="muted">{items ? `${items.length} formations au catalogue` : 'Chargement…'}</p>
        </div>
        <button className="btn btn-gold" onClick={() => ouvrir(null)}>+ Nouvelle formation</button>
      </div>
      <Flash />

      <div className="toolbar">
        <input type="search" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher une formation" />
        <select value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filtrer par département">
          <option value="">Tous les départements</option>
          {DEPARTEMENTS_LISTE.map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Formation</th><th>Département</th><th>Durée</th><th>Prix</th><th>Places</th><th>Sessions</th><th>Formateurs</th><th /></tr>
          </thead>
          <tbody>
            {visibles.map((f) => (
              <tr key={f.id}>
                <td><strong>{f.titre}</strong><div className="muted small">{f.categorie}</div></td>
                <td>{f.departement}</td>
                <td>{f.duree ? `${f.duree} h` : '—'}</td>
                <td>{formatPrix(f.prix)}{f.type_paiement === 'avance' && <div className="muted small">avance {formatPrix(f.montant_avance)}</div>}</td>
                <td>{f.nb_places}</td>
                <td>{f.nb_sessions}</td>
                <td>{f.nb_formateurs}</td>
                <td className="actions">
                  <button className="btn btn-light btn-sm" onClick={() => ouvrir(f)}>Modifier</button>
                  <button className="btn btn-danger btn-sm" onClick={() => supprimer(f)}>Supprimer</button>
                </td>
              </tr>
            ))}
            {items && visibles.length === 0 && <tr><td colSpan="8" className="muted center">Aucune formation.</td></tr>}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal title={edit.id ? 'Modifier la formation' : 'Nouvelle formation'} onClose={() => setEdit(null)} wide>
          <form className="form-panel" onSubmit={enregistrer}>
            {err && <div className="alert alert-error">{err}</div>}
            <div className="form-grid">
              <label className="span-2">Titre<input value={edit.titre} onChange={set('titre')} required /></label>
              <label>
                Département
                <select value={edit.departement} onChange={set('departement')} required>
                  {DEPARTEMENTS_LISTE.map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
              <label>
                Catégorie
                <input value={edit.categorie} onChange={set('categorie')} list="categories" placeholder="ex. Développement" />
                <datalist id="categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
              </label>
              <label className="span-2">Description<textarea rows="3" value={edit.description} onChange={set('description')} /></label>
              <label>Durée (heures)<input type="number" min="1" value={edit.duree} onChange={set('duree')} /></label>
              <label>Places par session<input type="number" min="1" value={edit.nb_places} onChange={set('nb_places')} required /></label>
              <label>Prix (DT)<input type="number" min="0" step="0.01" value={edit.prix} onChange={set('prix')} required /></label>
              <label>
                Paiement
                <select value={edit.type_paiement} onChange={set('type_paiement')}>
                  <option value="complet">Complet uniquement</option>
                  <option value="avance">Avance possible</option>
                </select>
              </label>
              {edit.type_paiement === 'avance' && (
                <label>Montant de l’avance (DT)<input type="number" min="1" step="0.01" value={edit.montant_avance} onChange={set('montant_avance')} required /></label>
              )}
              <label className="span-2">Compétences acquises <span className="muted small">(une par ligne)</span><textarea rows="3" value={edit.competences} onChange={set('competences')} /></label>
              <label className="span-2">Prérequis <span className="muted small">(un par ligne)</span><textarea rows="2" value={edit.prerequis} onChange={set('prerequis')} /></label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-light" onClick={() => setEdit(null)}>Annuler</button>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
