import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { deptInfo, formatDate, formatHeure, formatPrix } from '../utils/format.js';
import { useAuth } from '../context/AuthContext.jsx';

// Transforme un texte avec retours à la ligne / virgules en liste
const toList = (txt) =>
  (txt || '').split(/\r?\n|;|,(?=\s*[A-ZÀ-Ý])/).map((s) => s.replace(/^[-•\s]+/, '').trim()).filter(Boolean);

export default function FormationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [f, setF] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setF(null);
    setError('');
    api.formation(id).then(setF).catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <section className="block page">
        <div className="alert alert-error">{error}</div>
        <Link to="/formations" className="btn btn-light">← Retour aux formations</Link>
      </section>
    );
  }
  if (!f) return <div className="page-state">Chargement…</div>;

  const info = deptInfo(f.departement);
  const competences = toList(f.competences);
  const prerequis = toList(f.prerequis);

  return (
    <section className="block page">
      <Link to="/formations" className="back-link">← Toutes les formations</Link>

      <div className="detail">
        <div className="detail-main">
          <span className={`tag tone-${info.tone}`}>{info.icon} {f.departement} · {f.categorie}</span>
          <h1 className="section-title">{f.titre}</h1>
          <p className="section-subtitle">{f.description || 'Description à venir.'}</p>

          {competences.length > 0 && (
            <div className="detail-block">
              <h3>Compétences acquises</h3>
              <ul className="about-list">
                {competences.map((c) => <li key={c}><span className="check">✓</span> {c}</li>)}
              </ul>
            </div>
          )}

          {prerequis.length > 0 && (
            <div className="detail-block">
              <h3>Prérequis</h3>
              <ul className="plain-list">{prerequis.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          )}

          <div className="detail-block">
            <h3>Prochaines sessions</h3>
            {f.sessions.length === 0 ? (
              <p className="muted">Aucune session planifiée pour le moment.</p>
            ) : (
              <div className="session-list">
                {f.sessions.map((s) => (
                  <div key={s.id} className="session-item">
                    <div>
                      <strong>{formatDate(s.date_session)}</strong>
                      <span className="muted"> · {formatHeure(s.heure_debut)} – {formatHeure(s.heure_fin)}</span>
                      <div className="muted small">
                        {s.salle && <>Salle {s.salle} · </>}
                        {s.formateur_nom ? `Formateur : ${s.formateur_prenom} ${s.formateur_nom}` : 'Formateur à confirmer'}
                      </div>
                    </div>
                    <div className="session-item-actions">
                      <span className={`tag ${s.nb_places_restantes > 0 ? 'tag-live' : 'tag-full'}`}>
                        {s.nb_places_restantes > 0 ? `${s.nb_places_restantes} places` : 'Complet'}
                      </span>
                      {s.nb_places_restantes > 0 && (!user || user.role === 'participant') && (
                        <Link
                          to={user ? `/sessions/${s.id}/inscription` : '/connexion'}
                          state={user ? undefined : { from: `/sessions/${s.id}/inscription` }}
                          className="btn btn-gold btn-sm"
                        >
                          S’inscrire
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {f.documents.length > 0 && (
            <div className="detail-block">
              <h3>Documents</h3>
              <ul className="plain-list">
                {f.documents.map((d) => (
                  <li key={d.id}><a href={d.lien} target="_blank" rel="noreferrer">{d.titre}</a></li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="detail-side">
          <div className="price">{formatPrix(f.prix)}</div>
          {f.type_paiement === 'avance' && f.montant_avance && (
            <p className="muted small">Avance possible : {formatPrix(f.montant_avance)}</p>
          )}
          <ul className="facts">
            <li><span>Durée</span><strong>{f.duree ? `${f.duree} heures` : '—'}</strong></li>
            <li><span>Places par session</span><strong>{f.nb_places}</strong></li>
            <li><span>Paiement</span><strong>{f.type_paiement === 'avance' ? 'Avance + reste' : 'Complet'}</strong></li>
          </ul>
          {f.formateurs.length > 0 && (
            <div className="side-formateurs">
              <span className="muted small">Formateur{f.formateurs.length > 1 ? 's' : ''}</span>
              {f.formateurs.map((fo) => (
                <div key={fo.id} className="formateur-chip">
                  <span className="avatar">{fo.prenom?.[0]}{fo.nom?.[0]}</span>
                  <div><strong>{fo.prenom} {fo.nom}</strong><div className="muted small">{fo.specialite}</div></div>
                </div>
              ))}
            </div>
          )}
          {user ? (
            <Link to={user.role === 'participant' ? '/sessions' : '/espace'} className="btn btn-gold btn-block">
              {user.role === 'participant' ? 'Voir les sessions disponibles' : 'Aller à mon espace'}
            </Link>
          ) : (
            <Link to="/inscription" className="btn btn-gold btn-block">S’inscrire pour participer</Link>
          )}
        </aside>
      </div>
    </section>
  );
}
