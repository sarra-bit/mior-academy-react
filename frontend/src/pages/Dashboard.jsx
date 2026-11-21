import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate, formatHeure } from '../utils/format.js';

const ROLE_LABEL = { admin: 'Administrateur', formateur: 'Formateur', participant: 'Participant' };

// Raccourcis par rôle
const RACCOURCIS = {
  admin: [
    ['📚', 'Gérer les formations', '/admin/formations'],['👨‍🏫', 'Gérer les formateurs', '/admin/formateurs'],['🗓️', 'Planifier les sessions', '/admin/sessions'],
    ['👥', 'Gérer les groupes', '/admin/sessions'],['🧾', 'Valider les inscriptions', '/admin/inscriptions'],['✅', 'Suivi des présences', '/admin/presences'],
    ['🎓', 'Attestations', '/admin/attestations'], ['⚙️', 'Comptes', '/admin/comptes'],['👤', 'Mon profil', '/espace/profil'],
  ],
  formateur: [
    ['📚', 'Mes formations', '/formateur/formations'],['🗓️', 'Mes sessions', '/formateur/sessions'],['⏰', 'Mes disponibilités', '/formateur/disponibilites'],
    ['✅', 'Faire l’appel', '/formateur/sessions'],['💬', 'Messages', '/formateur/messages'], ['🎓', 'Mes attestations', '/formateur/attestations'], ['👤', 'Mon profil', '/espace/profil'],
  ],
  participant: [
    ['🔎', 'Sessions disponibles', '/sessions'], ['🧾', 'Mes inscriptions', '/espace/inscriptions'], ['🎓', 'Mes attestations', '/espace/attestations'],
    ['🔔', 'Alertes d’absence', '/espace/alertes'], ['💬', 'Contacter un formateur', '/espace/messages'], ['👤', 'Mon profil', '/espace/profil'],
  ],
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <section className="block page">
      <div className="dash-head">
        <div>
          <span className="eyebrow">Espace {ROLE_LABEL[user.role]}</span>
          <h1 className="section-title">Bonjour, {user.prenom} 👋</h1>
          <p className="section-subtitle">Voici un aperçu de votre activité sur M.I.O.R Academy.</p>
        </div>
        <span className={`role-badge role-${user.role}`}>{ROLE_LABEL[user.role]}</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stat-grid">
        {(data?.stats || Array.from({ length: 4 }, (_, i) => ({ label: '…', value: '–', key: i }))).map((s) => (
          <div key={s.key ?? s.label} className="hero-stat">
            <h3>{s.value}</h3>
            <p>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="panel">
          <h3>Prochaines sessions</h3>
          {!data ? (
            <p className="muted">Chargement…</p>
          ) : data.sessions.length === 0 ? (
            <p className="muted">Aucune session à venir.</p>
          ) : (
            <div className="session-list">
              {data.sessions.map((s) => (
                <div key={s.id} className="session-item">
                  <div>
                    <strong>{s.titre}</strong>
                    <div className="muted small">
                      {formatDate(s.date_session)} · {formatHeure(s.heure_debut)} – {formatHeure(s.heure_fin)}
                      {s.salle && <> · Salle {s.salle}</>}
                    </div>
                  </div>
                  {s.statut_inscription && (
                    <span className={`tag ${s.statut_inscription === 'confirmee' ? 'tag-live' : 'tag-wait'}`}>
                      {s.statut_inscription.replace('_', ' ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <h3>Raccourcis</h3>
          <div className="shortcut-grid">
            {RACCOURCIS[user.role].map(([icon, label, to]) =>
              to ? (
                <Link key={label} to={to} className="shortcut">
                  <span>{icon}</span>{label}
                </Link>
              ) : (
                <div key={label} className="shortcut shortcut-soon" title="Disponible dans une prochaine version">
                  <span>{icon}</span>{label}<em>bientôt</em>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
