import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import useFlash from '../utils/useFlash.jsx';

const dateHeure = (d) =>
  new Date(d.replace(' ', 'T')).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Alertes d'absence du participant (3 absences consécutives)
export default function MesAlertes() {
  const [data, setData] = useState(null);
  const { fail, Flash } = useFlash();

  const load = () => api.alertes.get().then(setData).catch((e) => fail(e.message));
  useEffect(() => { load(); }, []);

  const lire = async (id) => { try { await api.alertes.patch(`/${id}/lue`); load(); } catch (e) { fail(e.message); } };
  const toutLire = async () => { try { await api.alertes.patch('/lire-tout'); load(); } catch (e) { fail(e.message); } };

  return (
    <section className="block page">
      <div className="admin-head">
        <div>
          <h1 className="section-title">Alertes d’absence</h1>
          <p className="muted">Une alerte est envoyée automatiquement après 3 absences consécutives.</p>
        </div>
        {data?.non_lues > 0 && <button className="btn btn-light" onClick={toutLire}>Tout marquer comme lu</button>}
      </div>
      <Flash />

      {!data && <div className="page-state">Chargement…</div>}
      {data && data.alertes.length === 0 && (
        <div className="empty">
          <span>✅</span>
          <h3>Aucune alerte</h3>
          <p className="muted">Votre assiduité est bonne, continuez ainsi !</p>
        </div>
      )}

      <div className="alert-list">
        {(data?.alertes || []).map((a) => (
          <article key={a.id} className={`alerte ${a.statut === 'non_lue' ? 'alerte-new' : ''}`}>
            <span className="alerte-icon" aria-hidden="true">🔔</span>
            <div>
              <p><strong>{a.message}</strong></p>
              <p className="muted small">{dateHeure(a.date_alerte)}</p>
              {a.statut === 'non_lue' && (
                <p className="small">Une absence non justifiée ? Prévenez votre formateur via la <Link to="/espace/messages" className="link-btn">messagerie</Link>.</p>
              )}
            </div>
            {a.statut === 'non_lue'
              ? <button className="btn btn-light btn-sm" onClick={() => lire(a.id)}>Marquer comme lue</button>
              : <span className="tag">Lue</span>}
          </article>
        ))}
      </div>
    </section>
  );
}
