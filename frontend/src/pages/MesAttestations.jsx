import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import useFlash from '../utils/useFlash.jsx';
import { formatDate, formatHeure, deptInfo } from '../utils/format.js';

// Attestations du participant ou du formateur connecté
export default function MesAttestations() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(null);
  const { ok, fail, Flash } = useFlash();

  useEffect(() => { api.mesAttestations().then(setItems).catch((e) => fail(e.message)); }, []);

  const telecharger = async (a) => {
    setBusy(a.id);
    try { await api.telechargerAttestation(a); } catch (e) { fail(e.message); } finally { setBusy(null); }
  };
  const copier = async (code) => {
    try { await navigator.clipboard.writeText(code); ok(`Code ${code} copié.`); } catch { fail('Copie impossible : sélectionnez le code à la main.'); }
  };

  const contenu = (
    <>
      <div className="admin-head">
        <div>
          <h1 className="section-title">Mes attestations</h1>
          <p className="muted">
            {user.role === 'formateur'
              ? 'Une attestation d’animation est délivrée pour chaque session terminée que vous avez animée.'
              : 'Les attestations sont délivrées par l’administration après la session, si votre inscription est confirmée et payée.'}
          </p>
        </div>
      </div>
      <Flash />

      {!items && <div className="page-state">Chargement…</div>}
      {items && items.length === 0 && (
        <div className="empty">
          <span>🎓</span>
          <h3>Aucune attestation pour le moment</h3>
          <p className="muted">Elles apparaîtront ici dès que l’administration les aura générées.</p>
          {user.role === 'participant' && <Link to="/espace/inscriptions" className="btn btn-light">Voir mes inscriptions</Link>}
        </div>
      )}

      <div className="att-grid">
        {(items || []).map((a) => (
          <article key={a.id} className="att-card">
            <div className="att-ribbon">{deptInfo(a.departement).icon}</div>
            <span className="eyebrow">{a.type === 'formateur' ? 'Attestation d’animation' : 'Attestation de participation'}</span>
            <h3>{a.formation_titre}</h3>
            <p className="muted small">
              {formatDate(a.date_session)} · {formatHeure(a.heure_debut)} – {formatHeure(a.heure_fin)}
              {a.salle && <> · Salle {a.salle}</>}
            </p>
            <button className="att-code" onClick={() => copier(a.code_unique)} title="Copier le code">
              {a.code_unique} <span aria-hidden="true">⧉</span>
            </button>
            <p className="muted small">Délivrée le {formatDate(a.date_generation.slice(0, 10))}</p>
            <div className="att-actions">
              <button className="btn btn-gold btn-sm" onClick={() => telecharger(a)} disabled={busy === a.id}>
                {busy === a.id ? 'Préparation…' : '⬇ Télécharger le PDF'}
              </button>
              <Link to={`/verifier/${a.code_unique}`} className="btn btn-light btn-sm">Vérifier</Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );

  // Le formateur a son propre menu latéral ; le participant a une page simple
  return user.role === 'formateur' ? contenu : <section className="block page">{contenu}</section>;
}
