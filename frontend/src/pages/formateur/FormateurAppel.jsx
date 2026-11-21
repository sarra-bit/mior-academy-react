import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import useFlash from '../../utils/useFlash.jsx';
import { formatDate, formatHeure } from '../../utils/format.js';

const STATUTS = [
  { value: 'present', label: 'Présent', cls: 'st-present' },
  { value: 'retard', label: 'Retard', cls: 'st-retard' },
  { value: 'absent', label: 'Absent', cls: 'st-absent' },
  { value: 'excuse', label: 'Excusé', cls: 'st-excuse' },
];

export default function FormateurAppel() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [lignes, setLignes] = useState({}); // participant_id -> { statut_presence, remarque }
  const [groupe, setGroupe] = useState('');
  const [busy, setBusy] = useState(false);
  const { ok, fail, Flash } = useFlash();

  const load = () =>
    api.formateur.get(`/sessions/${id}/presences`).then((d) => {
      setData(d);
      setLignes(Object.fromEntries(d.participants.map((p) => [p.id, { statut_presence: p.statut_presence || '', remarque: p.remarque || '' }])));
    }).catch((e) => fail(e.message));
  useEffect(() => { load(); }, [id]);

  const groupes = useMemo(() => [...new Set((data?.participants || []).map((p) => p.groupe).filter(Boolean))], [data]);
  const visibles = (data?.participants || []).filter((p) => !groupe || p.groupe === groupe);

  const compte = useMemo(() => {
    const c = { present: 0, retard: 0, absent: 0, excuse: 0, vide: 0 };
    visibles.forEach((p) => { c[lignes[p.id]?.statut_presence || 'vide']++; });
    return c;
  }, [visibles, lignes]);

  if (!data) return <><Flash /><div className="page-state">Chargement…</div></>;
  const { session } = data;
  const ouvert = session.appel_ouvert && session.statut !== 'Annulée';

  const setLigne = (pid, champ, val) => setLignes({ ...lignes, [pid]: { ...lignes[pid], [champ]: val } });
  const tousPresents = () => {
    const next = { ...lignes };
    visibles.forEach((p) => { if (!next[p.id].statut_presence) next[p.id] = { ...next[p.id], statut_presence: 'present' }; });
    setLignes(next);
  };

  const enregistrer = async () => {
    const presences = visibles
      .filter((p) => lignes[p.id]?.statut_presence)
      .map((p) => ({ participant_id: p.id, ...lignes[p.id] }));
    if (!presences.length) { fail('Marquez au moins un participant.'); return; }
    setBusy(true);
    try { ok((await api.formateur.put(`/sessions/${id}/presences`, { presences })).message); await load(); }
    catch (e) { fail(e.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <Link to="/formateur/sessions" className="back-link">← Mes sessions</Link>
      <div className="admin-head">
        <div>
          <h1 className="section-title">Appel — {session.titre}</h1>
          <p className="muted">
            {formatDate(session.date_session)} · {formatHeure(session.heure_debut)} – {formatHeure(session.heure_fin)}
            {session.salle && <> · Salle {session.salle}</>}
          </p>
        </div>
        {ouvert && visibles.length > 0 && (
          <div className="actions">
            <button className="btn btn-light" onClick={tousPresents}>Marquer les autres présents</button>
            <button className="btn btn-gold" onClick={enregistrer} disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer l’appel'}</button>
          </div>
        )}
      </div>
      <Flash />

      {!ouvert && (
        <div className="alert alert-info">
          {session.statut === 'Annulée'
            ? 'Cette session est annulée.'
            : session.a_venir
              ? '🔒 L’appel s’ouvrira le jour de la session, à partir de l’heure de début. Voici la liste des participants.'
              : '🔒 Session terminée : les présences sont en lecture seule.'}
        </div>
      )}

      <div className="appel-stats">
        {STATUTS.map((s) => <div key={s.value} className={`appel-stat ${s.cls}`}><strong>{compte[s.value]}</strong>{s.label}</div>)}
        <div className="appel-stat"><strong>{compte.vide}</strong>Non marqués</div>
      </div>

      {groupes.length > 0 && (
        <div className="chips" style={{ marginBottom: 14 }}>
          <button className={`chip chip-sm ${!groupe ? 'active' : ''}`} onClick={() => setGroupe('')}>Tous les groupes</button>
          {groupes.map((g) => <button key={g} className={`chip chip-sm ${groupe === g ? 'active' : ''}`} onClick={() => setGroupe(g)}>{g}</button>)}
        </div>
      )}

      {visibles.length === 0 ? (
        <div className="empty"><span>👥</span><h3>Aucun participant confirmé</h3><p className="muted">Les participants apparaissent ici une fois leur inscription confirmée par l’administration.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="table appel-table">
            <thead><tr><th>Participant</th><th>Présence</th><th>Remarque</th></tr></thead>
            <tbody>
              {visibles.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="member-cell">
                      <span className="avatar">{p.prenom?.[0]}{p.nom?.[0]}</span>
                      <div><strong>{p.prenom} {p.nom}</strong><div className="muted small">{p.groupe || 'Sans groupe'}</div></div>
                    </div>
                  </td>
                  <td>
                    <div className="segmented" role="radiogroup" aria-label={`Présence de ${p.prenom} ${p.nom}`}>
                      {STATUTS.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          role="radio"
                          aria-checked={lignes[p.id]?.statut_presence === s.value}
                          className={`${s.cls} ${lignes[p.id]?.statut_presence === s.value ? 'active' : ''}`}
                          onClick={() => ouvert && setLigne(p.id, 'statut_presence', s.value)}
                          disabled={!ouvert}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td>
                    <input
                      value={lignes[p.id]?.remarque || ''}
                      onChange={(e) => setLigne(p.id, 'remarque', e.target.value)}
                      disabled={!ouvert}
                      placeholder={ouvert ? 'Optionnel' : ''}
                      maxLength={500}
                      aria-label={`Remarque pour ${p.prenom} ${p.nom}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {ouvert && <p className="muted small" style={{ marginTop: 10 }}>Un participant absent à 3 sessions consécutives reçoit automatiquement une alerte d’absence.</p>}
    </>
  );
}
