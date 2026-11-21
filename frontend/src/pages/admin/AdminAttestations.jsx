import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import useFlash from '../../utils/useFlash.jsx';
import Modal from '../../components/Modal.jsx';
import { formatDate, formatHeure } from '../../utils/format.js';

export default function AdminAttestations() {
  const [sessions, setSessions] = useState(null);
  const [busy, setBusy] = useState(null);
  const [detail, setDetail] = useState(null); // { session, items }
  const [filtre, setFiltre] = useState('a_generer');
  const { ok, fail, Flash } = useFlash();

  const load = () => api.admin.get('/attestations/sessions').then(setSessions).catch((e) => fail(e.message));
  useEffect(() => { load(); }, []);

  const manquantes = (s) => Math.max(0, Number(s.eligibles) - Number(s.att_participants)) + (s.formateur_nom && !Number(s.att_formateur) ? 1 : 0);

  const generer = async (s) => {
    setBusy(s.id);
    try { ok((await api.admin.post(`/attestations/sessions/${s.id}/generer`)).message); await load(); } catch (e) { fail(e.message); } finally { setBusy(null); }
  };

  const voir = async (s) => {
    try { setDetail({ session: s, items: await api.admin.get(`/attestations?session_id=${s.id}`) }); } catch (e) { fail(e.message); }
  };
  const telecharger = async (a) => { try { await api.telechargerAttestation(a); } catch (e) { fail(e.message); } };
  const revoquer = async (a) => {
    if (!window.confirm(`Révoquer l’attestation ${a.code_unique} de ${a.prenom} ${a.nom} ? Le code ne sera plus reconnu comme valide.`)) return;
    try {
      ok((await api.admin.del(`/attestations/${a.id}`)).message);
      setDetail((d) => ({ ...d, items: d.items.filter((x) => x.id !== a.id) }));
      load();
    } catch (e) { fail(e.message); }
  };

  const liste = (sessions || []).filter((s) => filtre === 'toutes' || manquantes(s) > 0);

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="section-title">Attestations</h1>
          <p className="muted">
            Sessions terminées. Une attestation est créée pour le formateur et pour chaque participant
            dont l’inscription est confirmée et payée (totalement ou avance). Chaque attestation porte un QR code de vérification.
          </p>
        </div>
        <Link to="/verifier" className="btn btn-light" target="_blank">Page de vérification ↗</Link>
      </div>
      <Flash />

      <div className="toolbar">
        <div className="chips">
          <button className={`chip chip-sm ${filtre === 'a_generer' ? 'active' : ''}`} onClick={() => setFiltre('a_generer')}>À générer</button>
          <button className={`chip chip-sm ${filtre === 'toutes' ? 'active' : ''}`} onClick={() => setFiltre('toutes')}>Toutes les sessions terminées</button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Session</th><th>Formateur</th><th>Participants éligibles</th><th>Attestations</th><th></th></tr></thead>
          <tbody>
            {liste.map((s) => {
              const total = Number(s.att_participants) + Number(s.att_formateur);
              const reste = manquantes(s);
              return (
                <tr key={s.id}>
                  <td>
                    <strong>{s.titre}</strong>
                    <div className="muted small">{formatDate(s.date_session)} · {formatHeure(s.heure_debut)} – {formatHeure(s.heure_fin)}{s.salle && <> · Salle {s.salle}</>}</div>
                  </td>
                  <td>{s.formateur_nom ? `${s.formateur_prenom} ${s.formateur_nom}` : <span className="muted">—</span>}</td>
                  <td>{s.eligibles}</td>
                  <td>
                    {total > 0 ? <span className="tag tag-live">{total} générée{total > 1 ? 's' : ''}</span> : <span className="tag">Aucune</span>}
                    {reste > 0 && total > 0 && <div className="muted small">{reste} manquante(s)</div>}
                  </td>
                  <td className="session-item-actions">
                    {reste > 0 && (
                      <button className="btn btn-gold btn-sm" onClick={() => generer(s)} disabled={busy === s.id}>
                        {busy === s.id ? 'Génération…' : `🎓 Générer (${reste})`}
                      </button>
                    )}
                    {total > 0 && <button className="btn btn-light btn-sm" onClick={() => voir(s)}>Voir</button>}
                  </td>
                </tr>
              );
            })}
            {sessions && liste.length === 0 && (
              <tr><td colSpan="5" className="muted center">
                {filtre === 'a_generer' ? 'Toutes les attestations sont à jour. 🎉' : 'Aucune session terminée.'}
              </td></tr>
            )}
            {!sessions && <tr><td colSpan="5" className="muted center">Chargement…</td></tr>}
          </tbody>
        </table>
      </div>

      {detail && (
        <Modal title={`Attestations — ${detail.session.titre}`} onClose={() => setDetail(null)} wide>
          <p className="muted small" style={{ marginBottom: 12 }}>{formatDate(detail.session.date_session)}</p>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Bénéficiaire</th><th>Type</th><th>Code</th><th></th></tr></thead>
              <tbody>
                {detail.items.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{a.prenom} {a.nom}</strong><div className="muted small">{a.email}</div></td>
                    <td><span className={`role-badge role-${a.type}`}>{a.type}</span></td>
                    <td><Link to={`/verifier/${a.code_unique}`} target="_blank"><code>{a.code_unique}</code></Link></td>
                    <td className="session-item-actions">
                      <button className="btn btn-light btn-sm" onClick={() => telecharger(a)}>PDF</button>
                      <button className="btn btn-danger btn-sm" onClick={() => revoquer(a)}>Révoquer</button>
                    </td>
                  </tr>
                ))}
                {detail.items.length === 0 && <tr><td colSpan="4" className="muted center">Aucune attestation.</td></tr>}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </>
  );
}
