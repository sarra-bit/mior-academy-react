import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import useFlash from '../../utils/useFlash.jsx';
import { formatDate, formatHeure } from '../../utils/format.js';

const STATUT_CLS = { 'Planifiée': 'tag-info', 'En cours': 'tag-live', 'Terminée': '', 'Annulée': 'tag-full' };
const today = () => new Date().toISOString().slice(0, 10);

export default function FormateurSessions() {
  const [periode, setPeriode] = useState('avenir');
  const [items, setItems] = useState(null);
  const { ok, fail, Flash } = useFlash();

  const load = () => {
    setItems(null);
    api.formateur.get(`/sessions?periode=${periode}`).then(setItems).catch((e) => fail(e.message));
  };
  useEffect(load, [periode]);

  const annuler = async (s) => {
    if (!window.confirm(`Annuler la session « ${s.titre} » du ${formatDate(s.date_session)} ?`)) return;
    try { ok((await api.formateur.patch(`/sessions/${s.id}/annuler`)).message); load(); } catch (e) { fail(e.message); }
  };

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="section-title">Mes sessions</h1>
          <p className="muted">L’appel s’ouvre le jour de la session, à partir de l’heure de début.</p>
        </div>
      </div>
      <Flash />

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={periode === 'avenir'} className={periode === 'avenir' ? 'active' : ''} onClick={() => setPeriode('avenir')}>Aujourd’hui & à venir</button>
        <button role="tab" aria-selected={periode === 'passees'} className={periode === 'passees' ? 'active' : ''} onClick={() => setPeriode('passees')}>Passées</button>
      </div>

      {!items && <div className="page-state">Chargement…</div>}
      {items && items.length === 0 && (
        <div className="empty">
          <span>🗓️</span>
          <h3>{periode === 'avenir' ? 'Aucune session à venir' : 'Aucune session passée'}</h3>
          <p className="muted">Les sessions sont planifiées par l’administration selon vos disponibilités.</p>
          <Link to="/formateur/disponibilites" className="btn btn-light">Gérer mes disponibilités</Link>
        </div>
      )}

      <div className="session-cards">
        {(items || []).map((s) => {
          const estAujourdhui = s.date_session === today();
          return (
            <article key={s.id} className={`session-card ${estAujourdhui ? 'session-today' : ''}`}>
              <div className="session-date">
                <strong>{new Date(`${s.date_session}T00:00:00`).getDate()}</strong>
                <span>{new Date(`${s.date_session}T00:00:00`).toLocaleDateString('fr-FR', { month: 'short' })}</span>
              </div>
              <div className="session-body">
                <div className="insc-tags">
                  <span className={`tag ${STATUT_CLS[s.statut] || ''}`}>{s.statut}</span>
                  {estAujourdhui && <span className="tag tag-wait">Aujourd’hui</span>}
                </div>
                <h3>{s.titre}</h3>
                <p className="muted small">
                  {formatDate(s.date_session)} · {formatHeure(s.heure_debut)} – {formatHeure(s.heure_fin)}
                  {s.salle && <> · Salle {s.salle}</>}
                </p>
                <p className="muted small">
                  👥 {s.nb_confirmes} participant{s.nb_confirmes > 1 ? 's' : ''} confirmé{s.nb_confirmes > 1 ? 's' : ''}
                  {s.nb_groupes > 0 && <> · {s.nb_groupes} groupe(s)</>}
                  {s.nb_presences > 0 && <> · appel fait ({s.nb_presences})</>}
                </p>
              </div>
              <div className="session-action">
                {s.statut !== 'Annulée' && (s.appel_ouvert ? (
                  <Link to={`/formateur/sessions/${s.id}/appel`} className="btn btn-gold btn-sm">✅ Faire l’appel</Link>
                ) : (
                  <Link to={`/formateur/sessions/${s.id}/appel`} className="btn btn-light btn-sm">
                    {periode === 'passees' ? 'Voir les présences' : 'Voir les participants'}
                  </Link>
                ))}
                {periode === 'avenir' && s.statut === 'Planifiée' && !s.appel_ouvert && (
                  <button className="btn btn-danger btn-sm" onClick={() => annuler(s)}>Annuler</button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
