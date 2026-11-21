import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../services/api.js';
import { formatDate, formatHeure, formatPrix } from '../utils/format.js';
import { STATUT_INSCRIPTION, STATUT_PAIEMENT } from '../utils/statuts.js';

const today = () => new Date().toISOString().slice(0, 10);

export default function MesInscriptions() {
  const location = useLocation();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(location.state?.success || '');
  const [tab, setTab] = useState('avenir');
  const [busyId, setBusyId] = useState(null);

  const load = () => api.mesInscriptions().then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const annuler = async (insc) => {
    if (!window.confirm(`Annuler votre inscription à « ${insc.titre} » ?`)) return;
    setBusyId(insc.id);
    setError('');
    setSuccess('');
    try {
      const r = await api.annulerInscription(insc.id);
      setSuccess(r.message);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const avenir = (items || []).filter((i) => i.date_session >= today());
  const passees = (items || []).filter((i) => i.date_session < today());
  const liste = tab === 'avenir' ? avenir : passees;

  return (
    <section className="block page">
      <Link to="/espace" className="back-link">← Mon espace</Link>
      <div className="dash-head">
        <div>
          <span className="eyebrow">Participant</span>
          <h1 className="section-title">Mes inscriptions</h1>
          <p className="section-subtitle">Suivez l’état de vos inscriptions et de vos paiements.</p>
        </div>
        <Link to="/sessions" className="btn btn-gold">+ Nouvelle inscription</Link>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'avenir'} className={tab === 'avenir' ? 'active' : ''} onClick={() => setTab('avenir')}>
          À venir <span className="chip-count">{avenir.length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'passees'} className={tab === 'passees' ? 'active' : ''} onClick={() => setTab('passees')}>
          Passées <span className="chip-count">{passees.length}</span>
        </button>
      </div>

      {!items && !error && <div className="page-state">Chargement…</div>}
      {items && liste.length === 0 && (
        <div className="empty">
          <span>🧾</span>
          <h3>{tab === 'avenir' ? 'Aucune inscription à venir' : 'Aucune session passée'}</h3>
          {tab === 'avenir' && <Link to="/sessions" className="btn btn-light">Voir les sessions disponibles</Link>}
        </div>
      )}

      <div className="insc-list">
        {liste.map((i) => {
          const si = STATUT_INSCRIPTION[i.statut_inscription] || {};
          const sp = STATUT_PAIEMENT[i.statut_paiement] || {};
          const reste = Number(i.montant_a_payer || i.prix) - Number(i.montant_paye || 0);
          return (
            <article key={i.id} className="insc-card">
              <div className="insc-main">
                <div className="insc-tags">
                  <span className={`tag ${si.cls}`}>{si.label}</span>
                  <span className={`tag ${sp.cls}`}>{sp.label}</span>
                </div>
                <h3><Link to={`/formations/${i.formation_id}`}>{i.titre}</Link></h3>
                <p className="muted small">
                  {formatDate(i.date_session)} · {formatHeure(i.heure_debut)} – {formatHeure(i.heure_fin)}
                  {i.salle && <> · Salle {i.salle}</>}
                  {i.formateur_nom && <> · {i.formateur_prenom} {i.formateur_nom}</>}
                </p>
                <p className="muted small">
                  {i.mode_paiement || 'Mode non précisé'}
                  {i.reference_paiement && <> · Réf. {i.reference_paiement}</>}
                  {' · '}inscrit le {formatDate(i.date_inscription?.slice(0, 10))}
                </p>
              </div>
              <div className="insc-side">
                <div className="small muted">Payé</div>
                <strong>{formatPrix(i.montant_paye)}</strong>
                {reste > 0 && i.statut_paiement !== 'refuse' && <div className="small muted">Reste : {formatPrix(reste)}</div>}
                {i.statut_inscription === 'en_attente' && i.date_session >= today() && (
                  <button className="btn btn-light btn-sm" onClick={() => annuler(i)} disabled={busyId === i.id}>
                    {busyId === i.id ? 'Annulation…' : 'Annuler'}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
