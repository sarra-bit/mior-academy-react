import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import useFlash from '../../utils/useFlash.jsx';
import { formatDate } from '../../utils/format.js';

const ROLES = { '': 'Tous', participant: 'Participants', formateur: 'Formateurs', admin: 'Administrateurs' };

export default function AdminComptes() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const { ok, fail, Flash } = useFlash();

  const load = () => {
    const qs = new URLSearchParams(Object.entries({ role, q }).filter(([, v]) => v)).toString();
    api.admin.get(`/comptes${qs ? `?${qs}` : ''}`).then(setItems).catch((e) => fail(e.message));
  };
  useEffect(() => {
    const t = setTimeout(load, 250); // attend la fin de la frappe
    return () => clearTimeout(t);
  }, [role, q]);

  const toggle = async (c) => {
    try { ok((await api.admin.patch(`/comptes/${c.id}/statut`, { statut: c.statut ? 0 : 1 })).message); load(); } catch (e) { fail(e.message); }
  };

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="section-title">Comptes</h1>
          <p className="muted">Activez ou désactivez l’accès des utilisateurs. Un compte désactivé ne peut plus se connecter.</p>
        </div>
      </div>
      <Flash />

      <div className="toolbar">
        <div className="chips">
          {Object.entries(ROLES).map(([k, v]) => (
            <button key={k} className={`chip chip-sm ${role === k ? 'active' : ''}`} onClick={() => setRole(k)}>{v}</button>
          ))}
        </div>
        <input type="search" placeholder="Nom, prénom ou e-mail…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un compte" />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Utilisateur</th><th>Rôle</th><th>Téléphone</th><th>Inscriptions</th><th>Créé le</th><th>Statut</th></tr></thead>
          <tbody>
            {(items || []).map((c) => (
              <tr key={c.id}>
                <td><strong>{c.prenom} {c.nom}</strong><div className="muted small">{c.email}</div></td>
                <td><span className={`role-badge role-${c.role}`}>{c.role}</span></td>
                <td>{c.telephone || '—'}</td>
                <td>{c.role === 'participant' ? c.nb_inscriptions : '—'}</td>
                <td>{formatDate(c.created_at?.slice(0, 10))}</td>
                <td>
                  <button
                    className={`switch ${c.statut ? 'on' : ''}`}
                    onClick={() => toggle(c)}
                    disabled={c.id === user.id}
                    aria-pressed={!!c.statut}
                    title={c.id === user.id ? 'Votre propre compte' : c.statut ? 'Désactiver' : 'Activer'}
                  >
                    {c.statut ? 'Actif' : 'Inactif'}
                  </button>
                </td>
              </tr>
            ))}
            {items && items.length === 0 && <tr><td colSpan="6" className="muted center">Aucun compte.</td></tr>}
            {!items && <tr><td colSpan="6" className="muted center">Chargement…</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
