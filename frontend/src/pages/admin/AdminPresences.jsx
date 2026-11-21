import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import useFlash from '../../utils/useFlash.jsx';
import Modal from '../../components/Modal.jsx';
import { formatDate, formatHeure } from '../../utils/format.js';

const LIBELLE = { present: 'Présent', retard: 'Retard', absent: 'Absent', excuse: 'Excusé' };
const dateHeure = (d) => new Date(d.replace(' ', 'T')).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Suivi des présences et des alertes d'absence (lecture seule)
export default function AdminPresences() {
  const [onglet, setOnglet] = useState('sessions');
  const [sessions, setSessions] = useState(null);
  const [alertes, setAlertes] = useState(null);
  const [detail, setDetail] = useState(null);
  const [q, setQ] = useState('');
  const { fail, Flash } = useFlash();

  useEffect(() => {
    api.admin.get('/presences/sessions').then(setSessions).catch((e) => fail(e.message));
    api.admin.get('/presences/alertes').then(setAlertes).catch((e) => fail(e.message));
  }, []);

  const voir = async (s) => { try { setDetail(await api.admin.get(`/presences/sessions/${s.id}`)); } catch (e) { fail(e.message); } };

  const filtre = (txt) => txt.toLowerCase().includes(q.trim().toLowerCase());
  const listeSessions = (sessions || []).filter((s) => filtre(`${s.titre} ${s.formateur_prenom || ''} ${s.formateur_nom || ''} ${s.salle || ''}`));
  const listeAlertes = (alertes || []).filter((a) => filtre(`${a.prenom} ${a.nom} ${a.email} ${a.message}`));
  const nonLues = (alertes || []).filter((a) => a.statut === 'non_lue').length;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="section-title">Suivi des présences</h1>
          <p className="muted">L’appel est fait par le formateur. Après 3 absences consécutives, le participant reçoit une alerte.</p>
        </div>
      </div>
      <Flash />

      <div className="toolbar">
        <div className="tabs" role="tablist" style={{ marginBottom: 0 }}>
          <button role="tab" aria-selected={onglet === 'sessions'} className={onglet === 'sessions' ? 'active' : ''} onClick={() => setOnglet('sessions')}>Sessions</button>
          <button role="tab" aria-selected={onglet === 'alertes'} className={onglet === 'alertes' ? 'active' : ''} onClick={() => setOnglet('alertes')}>
            Alertes d’absence{alertes ? ` (${alertes.length})` : ''}
          </button>
        </div>
        <input type="search" placeholder={onglet === 'sessions' ? 'Formation, formateur, salle…' : 'Participant, e-mail…'} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filtrer" />
      </div>

      {onglet === 'sessions' && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Session</th><th>Formateur</th><th>Appel</th><th>Taux de présence</th><th></th></tr></thead>
            <tbody>
              {listeSessions.map((s) => {
                const venus = s.presents + s.retards;
                const taux = s.saisies ? Math.round((venus / s.saisies) * 100) : null;
                return (
                  <tr key={s.id}>
                    <td><strong>{s.titre}</strong><div className="muted small">{formatDate(s.date_session)} · {formatHeure(s.heure_debut)} – {formatHeure(s.heure_fin)}{s.salle && <> · Salle {s.salle}</>}</div></td>
                    <td>{s.formateur_nom ? `${s.formateur_prenom} ${s.formateur_nom}` : <span className="muted">—</span>}</td>
                    <td>
                      {s.saisies ? (
                        <div className="presence-mini">
                          <span className="st-pill st-present" title="Présents">{s.presents}</span>
                          <span className="st-pill st-retard" title="Retards">{s.retards}</span>
                          <span className="st-pill st-absent" title="Absents">{s.absents}</span>
                          <span className="st-pill st-excuse" title="Excusés">{s.excuses}</span>
                        </div>
                      ) : <span className="tag tag-wait">Non fait</span>}
                    </td>
                    <td>
                      {taux === null ? <span className="muted">—</span> : (
                        <div className="taux"><div className="places-bar"><span style={{ width: `${taux}%` }} /></div><strong>{taux}%</strong></div>
                      )}
                    </td>
                    <td><button className="btn btn-light btn-sm" onClick={() => voir(s)}>Détail</button></td>
                  </tr>
                );
              })}
              {sessions && listeSessions.length === 0 && <tr><td colSpan="5" className="muted center">Aucune session.</td></tr>}
              {!sessions && <tr><td colSpan="5" className="muted center">Chargement…</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {onglet === 'alertes' && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Participant</th><th>Alerte</th><th>Date</th><th>Vue par le participant</th></tr></thead>
            <tbody>
              {listeAlertes.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.prenom} {a.nom}</strong><div className="muted small">{a.email}{a.telephone && <> · {a.telephone}</>}</div></td>
                  <td>{a.message}</td>
                  <td className="small">{dateHeure(a.date_alerte)}</td>
                  <td>{a.statut === 'lue' ? <span className="tag tag-live">Lue</span> : <span className="tag tag-wait">Non lue</span>}</td>
                </tr>
              ))}
              {alertes && listeAlertes.length === 0 && <tr><td colSpan="4" className="muted center">Aucune alerte d’absence.</td></tr>}
              {!alertes && <tr><td colSpan="4" className="muted center">Chargement…</td></tr>}
            </tbody>
          </table>
          {nonLues > 0 && <p className="muted small" style={{ marginTop: 10 }}>{nonLues} alerte(s) pas encore vue(s) par le participant.</p>}
        </div>
      )}

      {detail && (
        <Modal title={`Présences — ${detail.session.titre}`} onClose={() => setDetail(null)} wide>
          <p className="muted small" style={{ marginBottom: 12 }}>
            {formatDate(detail.session.date_session)} · {formatHeure(detail.session.heure_debut)} – {formatHeure(detail.session.heure_fin)}
            {detail.session.formateur_nom && <> · {detail.session.formateur_prenom} {detail.session.formateur_nom}</>}
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Participant</th><th>Groupe</th><th>Statut</th><th>Remarque</th><th>Absences (total)</th></tr></thead>
              <tbody>
                {detail.participants.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.prenom} {p.nom}</strong><div className="muted small">{p.email}</div></td>
                    <td>{p.groupe || <span className="muted">—</span>}</td>
                    <td>{p.statut_presence ? <span className={`st-pill st-${p.statut_presence}`}>{LIBELLE[p.statut_presence]}</span> : <span className="muted small">Non renseigné</span>}</td>
                    <td className="small">{p.remarque || <span className="muted">—</span>}</td>
                    <td>{p.absences_total >= 3 ? <strong style={{ color: 'var(--err)' }}>{p.absences_total}</strong> : p.absences_total}</td>
                  </tr>
                ))}
                {detail.participants.length === 0 && <tr><td colSpan="5" className="muted center">Aucun participant.</td></tr>}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </>
  );
}
