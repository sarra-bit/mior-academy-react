import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { deptInfo, formatDate, formatHeure, formatPrix } from '../utils/format.js';

export default function Sessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [inscrites, setInscrites] = useState(new Set());
  const [state, setState] = useState('loading');
  const [dept, setDept] = useState('');

  useEffect(() => {
    api.sessionsDisponibles()
      .then((d) => { setSessions(d); setState('ready'); })
      .catch(() => setState('error'));
    if (user?.role === 'participant') {
      api.mesInscriptions().then((l) => setInscrites(new Set(l.map((i) => i.session_id)))).catch(() => {});
    }
  }, [user]);

  const departements = useMemo(() => [...new Set(sessions.map((s) => s.departement).filter(Boolean))], [sessions]);
  const visibles = dept ? sessions.filter((s) => s.departement === dept) : sessions;

  const action = (s) => {
    if (inscrites.has(s.id)) return <span className="tag tag-live">✓ Déjà inscrit</span>;
    if (!user) return <Link to="/connexion" state={{ from: `/sessions/${s.id}/inscription` }} className="btn btn-gold">Se connecter pour s’inscrire</Link>;
    if (user.role !== 'participant') return null;
    return <Link to={`/sessions/${s.id}/inscription`} className="btn btn-gold">S’inscrire</Link>;
  };

  return (
    <section className="block page">
      <div className="section-head">
        <span className="eyebrow">Calendrier</span>
        <h1 className="section-title">Sessions disponibles</h1>
        <p className="section-subtitle">Les prochaines sessions ouvertes aux inscriptions, avec les places restantes.</p>
      </div>

      {departements.length > 1 && (
        <div className="chips" style={{ marginBottom: 24 }}>
          <button className={`chip ${!dept ? 'active' : ''}`} onClick={() => setDept('')}>Toutes</button>
          {departements.map((d) => (
            <button key={d} className={`chip ${dept === d ? 'active' : ''}`} onClick={() => setDept(d)}>
              {deptInfo(d).icon} {d}
            </button>
          ))}
        </div>
      )}

      {state === 'loading' && <div className="page-state">Chargement des sessions…</div>}
      {state === 'error' && <div className="alert alert-error">Impossible de charger les sessions.</div>}
      {state === 'ready' && visibles.length === 0 && (
        <div className="empty">
          <span>🗓️</span>
          <h3>Aucune session ouverte pour le moment</h3>
          <p className="muted">De nouvelles sessions sont planifiées régulièrement. Consultez notre catalogue en attendant.</p>
          <Link to="/formations" className="btn btn-light">Voir les formations</Link>
        </div>
      )}

      <div className="session-cards">
        {visibles.map((s) => {
          const ratio = s.nb_places ? (s.nb_places - s.nb_places_restantes) / s.nb_places : 0;
          return (
            <article key={s.id} className="session-card">
              <div className="session-date">
                <strong>{new Date(`${s.date_session}T00:00:00`).getDate()}</strong>
                <span>{new Date(`${s.date_session}T00:00:00`).toLocaleDateString('fr-FR', { month: 'short' })}</span>
              </div>
              <div className="session-body">
                <span className={`tag tone-${deptInfo(s.departement).tone}`}>{deptInfo(s.departement).icon} {s.categorie || s.departement}</span>
                <h3><Link to={`/formations/${s.formation_id}`}>{s.titre}</Link></h3>
                <p className="muted small">
                  {formatDate(s.date_session)} · {formatHeure(s.heure_debut)} – {formatHeure(s.heure_fin)}
                  {s.salle && <> · Salle {s.salle}</>}
                  {s.formateur_nom && <> · {s.formateur_prenom} {s.formateur_nom}</>}
                </p>
                <div className="places">
                  <div className="places-bar"><span style={{ width: `${Math.round(ratio * 100)}%` }} /></div>
                  <span className="small muted">{s.nb_places_restantes} place{s.nb_places_restantes > 1 ? 's' : ''} restante{s.nb_places_restantes > 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="session-action">
                <strong className="price-sm">{formatPrix(s.prix)}</strong>
                {action(s)}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
