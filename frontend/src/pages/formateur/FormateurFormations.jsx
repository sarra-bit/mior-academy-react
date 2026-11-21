import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { deptInfo } from '../../utils/format.js';

export default function FormateurFormations() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.formateur.get('/formations').then(setItems).catch((e) => setError(e.message)); }, []);

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="section-title">Mes formations</h1>
          <p className="muted">Les formations que l’administration vous a affectées.</p>
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {!items && !error && <div className="page-state">Chargement…</div>}
      {items && items.length === 0 && (
        <div className="empty"><span>📚</span><h3>Aucune formation affectée</h3><p className="muted">Contactez l’administration pour être affecté à des formations.</p></div>
      )}
      <div className="formation-grid">
        {(items || []).map((f) => (
          <Link key={f.id} to={`/formations/${f.id}`} className="formation-card">
            <div className="formation-card-top">
              <span className={`tag tone-${deptInfo(f.departement).tone}`}>{deptInfo(f.departement).icon} {f.categorie || f.departement}</span>
            </div>
            <h3>{f.titre}</h3>
            <p>{f.description ? f.description.slice(0, 110) + (f.description.length > 110 ? '…' : '') : 'Description à venir.'}</p>
            <div className="formation-meta">
              <span>⏱ {f.duree ? `${f.duree} h` : '—'}</span>
              <span>{f.mes_sessions} session(s) animée(s)</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
