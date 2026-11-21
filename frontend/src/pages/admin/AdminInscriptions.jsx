import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import useFlash from '../../utils/useFlash.jsx';
import { formatDate, formatPrix } from '../../utils/format.js';
import { STATUT_INSCRIPTION, STATUT_PAIEMENT } from '../../utils/statuts.js';

const FILTRES = { '': 'Toutes', en_attente: 'En attente', confirmee: 'Confirmées', refusee: 'Refusées' };

export default function AdminInscriptions() {
  const [params, setParams] = useSearchParams();
  const statut = params.get('statut') || '';
  const [q, setQ] = useState('');
  const [items, setItems] = useState(null);
  const [paiement, setPaiement] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const { ok, fail, Flash } = useFlash();

  const load = () => {
    const qs = new URLSearchParams(Object.entries({ statut, q }).filter(([, v]) => v)).toString();
    return api.admin.get(`/inscriptions${qs ? `?${qs}` : ''}`).then(setItems).catch((e) => fail(e.message));
  };
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [statut, q]);

  const action = async (i, verbe, fn) => {
    setBusyId(i.id);
    try { ok((await fn()).message); await load(); } catch (e) { fail(e.message); } finally { setBusyId(null); }
  };
  const valider = (i) => action(i, 'valider', () => api.admin.post(`/inscriptions/${i.id}/valider`));
  const refuser = (i) => window.confirm(`Refuser l’inscription de ${i.prenom} ${i.nom} ?`) && action(i, 'refuser', () => api.admin.post(`/inscriptions/${i.id}/refuser`));
  const supprimer = (i) => window.confirm(`Supprimer définitivement l’inscription de ${i.prenom} ${i.nom} ?`) && action(i, 'supprimer', () => api.admin.del(`/inscriptions/${i.id}`));

  const enregistrerPaiement = async (e) => {
    e.preventDefault();
    await action(paiement, 'paiement', () => api.admin.patch(`/inscriptions/${paiement.id}/paiement`, paiement));
    setPaiement(null);
  };

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="section-title">Inscriptions</h1>
          <p className="muted">Vérifiez les paiements puis confirmez ou refusez les inscriptions. Une place est réservée à la confirmation.</p>
        </div>
      </div>
      <Flash />

      <div className="toolbar">
        <div className="chips">
          {Object.entries(FILTRES).map(([k, v]) => (
            <button key={k} className={`chip chip-sm ${statut === k ? 'active' : ''}`} onClick={() => setParams(k ? { statut: k } : {})}>{v}</button>
          ))}
        </div>
        <input type="search" placeholder="Participant, formation, référence…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher une inscription" />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Participant</th><th>Session</th><th>Paiement</th><th>Montant</th><th>Statut</th><th /></tr></thead>
          <tbody>
            {(items || []).map((i) => {
              const si = STATUT_INSCRIPTION[i.statut_inscription] || {};
              const sp = STATUT_PAIEMENT[i.statut_paiement] || {};
              return (
                <tr key={i.id}>
                  <td><strong>{i.prenom} {i.nom}</strong><div className="muted small">{i.email}</div></td>
                  <td><strong>{i.titre}</strong><div className="muted small">{formatDate(i.date_session)} · {i.nb_places_restantes} place(s) libre(s)</div></td>
                  <td>
                    <span className={`tag ${sp.cls}`}>{sp.label}</span>
                    <div className="muted small">{i.mode_paiement || '—'}{i.reference_paiement && <> · {i.reference_paiement}</>}</div>
                  </td>
                  <td>{formatPrix(i.montant_paye)}<div className="muted small">sur {formatPrix(i.montant_a_payer || i.prix)}</div></td>
                  <td><span className={`tag ${si.cls}`}>{si.label}</span></td>
                  <td className="actions">
                    {i.statut_inscription !== 'confirmee' && (
                      <button className="btn btn-gold btn-sm" onClick={() => valider(i)} disabled={busyId === i.id}>Confirmer</button>
                    )}
                    {i.statut_inscription !== 'refusee' && (
                      <button className="btn btn-light btn-sm" onClick={() => refuser(i)} disabled={busyId === i.id}>Refuser</button>
                    )}
                    <button className="btn btn-light btn-sm" onClick={() => setPaiement({ id: i.id, nom: `${i.prenom} ${i.nom}`, statut_paiement: i.statut_paiement, montant_paye: i.montant_paye, montant_a_payer: i.montant_a_payer || i.prix, prix: i.prix })}>
                      Paiement
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => supprimer(i)} disabled={busyId === i.id}>Suppr.</button>
                  </td>
                </tr>
              );
            })}
            {items && items.length === 0 && <tr><td colSpan="6" className="muted center">Aucune inscription.</td></tr>}
            {!items && <tr><td colSpan="6" className="muted center">Chargement…</td></tr>}
          </tbody>
        </table>
      </div>

      {paiement && (
        <Modal title={`Paiement — ${paiement.nom}`} onClose={() => setPaiement(null)}>
          <form className="form-panel" onSubmit={enregistrerPaiement}>
            <p className="muted small">Ex. : le participant a payé en espèces au centre. Prix de la formation : {formatPrix(paiement.prix)}.</p>
            <label>
              Statut du paiement
              <select value={paiement.statut_paiement} onChange={(e) => setPaiement({ ...paiement, statut_paiement: e.target.value })}>
                {Object.entries(STATUT_PAIEMENT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <label>
              Montant payé (DT)
              <input type="number" min="0" step="0.01" value={paiement.montant_paye} onChange={(e) => setPaiement({ ...paiement, montant_paye: e.target.value })} required />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn btn-light" onClick={() => setPaiement(null)}>Annuler</button>
              <button className="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
