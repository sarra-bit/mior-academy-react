import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import useFlash from '../../utils/useFlash.jsx';
import { formatDate, formatHeure } from '../../utils/format.js';

export default function AdminGroupes() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState('');
  const [choix, setChoix] = useState({}); // groupe_id -> participant_id sélectionné
  const { ok, fail, Flash } = useFlash();

  const load = () => api.admin.get(`/groupes?session_id=${id}`).then(setData).catch((e) => fail(e.message));
  useEffect(() => { load(); }, [id]);

  const enregistrer = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const r = edit.id
        ? await api.admin.put(`/groupes/${edit.id}`, edit)
        : await api.admin.post('/groupes', { ...edit, session_id: Number(id) });
      ok(r.message);
      setEdit(null);
      load();
    } catch (e2) { setErr(e2.message); }
  };

  const supprimer = async (g) => {
    if (!window.confirm(`Supprimer le groupe « ${g.nom_groupe} » ? Ses participants redeviendront « sans groupe ».`)) return;
    try { ok((await api.admin.del(`/groupes/${g.id}`)).message); load(); } catch (e) { fail(e.message); }
  };

  const ajouter = async (g) => {
    const pid = choix[g.id];
    if (!pid) return;
    try {
      ok((await api.admin.post(`/groupes/${g.id}/participants`, { participant_id: Number(pid) })).message);
      setChoix({ ...choix, [g.id]: '' });
      load();
    } catch (e) { fail(e.message); }
  };

  const retirer = async (g, p) => {
    try { ok((await api.admin.del(`/groupes/${g.id}/participants/${p.id}`)).message); load(); } catch (e) { fail(e.message); }
  };

  if (!data) return <><Flash /><div className="page-state">Chargement…</div></>;
  const { session, groupes, disponibles } = data;

  return (
    <>
      <Link to="/admin/sessions" className="back-link">← Sessions</Link>
      <div className="admin-head">
        <div>
          <h1 className="section-title">Groupes — {session.titre}</h1>
          <p className="muted">
            {formatDate(session.date_session)} · {formatHeure(session.heure_debut)} – {formatHeure(session.heure_fin)}
            {session.salle && <> · Salle {session.salle}</>}
          </p>
        </div>
        <button className="btn btn-gold" onClick={() => { setErr(''); setEdit({ nom_groupe: '', description: '' }); }}>+ Nouveau groupe</button>
      </div>
      <Flash />

      <div className="alert alert-info">
        {disponibles.length
          ? <>👥 <strong>{disponibles.length}</strong> participant(s) confirmé(s) sans groupe : {disponibles.map((p) => `${p.prenom} ${p.nom}`).join(', ')}.</>
          : 'Tous les participants confirmés sont dans un groupe (seules les inscriptions confirmées peuvent être affectées).'}
      </div>

      {groupes.length === 0 ? (
        <div className="empty">
          <span>👥</span>
          <h3>Aucun groupe pour cette session</h3>
          <p className="muted">Créez un groupe puis ajoutez-y les participants confirmés.</p>
        </div>
      ) : (
        <div className="groupe-grid">
          {groupes.map((g) => (
            <div key={g.id} className="panel">
              <div className="groupe-head">
                <div>
                  <h3>{g.nom_groupe}</h3>
                  {g.description && <p className="muted small">{g.description}</p>}
                </div>
                <div className="actions">
                  <button className="btn btn-light btn-sm" onClick={() => { setErr(''); setEdit({ ...g, description: g.description || '' }); }}>Modifier</button>
                  <button className="btn btn-danger btn-sm" onClick={() => supprimer(g)}>Supprimer</button>
                </div>
              </div>

              <ul className="member-list">
                {g.participants.map((p) => (
                  <li key={p.id}>
                    <span className="avatar">{p.prenom?.[0]}{p.nom?.[0]}</span>
                    <div><strong>{p.prenom} {p.nom}</strong><div className="muted small">{p.email}</div></div>
                    <button className="link-btn danger" onClick={() => retirer(g, p)} aria-label={`Retirer ${p.prenom} ${p.nom}`}>Retirer</button>
                  </li>
                ))}
                {g.participants.length === 0 && <li className="muted small">Aucun participant.</li>}
              </ul>

              {disponibles.length > 0 && (
                <div className="add-member">
                  <select value={choix[g.id] || ''} onChange={(e) => setChoix({ ...choix, [g.id]: e.target.value })} aria-label="Participant à ajouter">
                    <option value="">Ajouter un participant…</option>
                    {disponibles.map((p) => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={() => ajouter(g)} disabled={!choix[g.id]}>Ajouter</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {edit && (
        <Modal title={edit.id ? 'Modifier le groupe' : 'Nouveau groupe'} onClose={() => setEdit(null)}>
          <form className="form-panel" onSubmit={enregistrer}>
            {err && <div className="alert alert-error">{err}</div>}
            <label>Nom du groupe<input value={edit.nom_groupe} onChange={(e) => setEdit({ ...edit, nom_groupe: e.target.value })} required placeholder="ex. Groupe A" /></label>
            <label>Description<textarea rows="3" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></label>
            <div className="modal-actions">
              <button type="button" className="btn btn-light" onClick={() => setEdit(null)}>Annuler</button>
              <button className="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
