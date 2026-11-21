import { NavLink, Outlet } from 'react-router-dom';

const LIENS = [
  ['/admin/inscriptions', '🧾', 'Inscriptions'],
  ['/admin/sessions', '🗓️', 'Sessions & groupes'],
  ['/admin/formations', '📚', 'Formations'],
  ['/admin/formateurs', '👨‍🏫', 'Formateurs'],
  ['/admin/presences', '✅', 'Présences & alertes'],
  ['/admin/attestations', '🎓', 'Attestations'],
  ['/admin/comptes', '⚙️', 'Comptes'],
];

export default function AdminLayout() {
  return (
    <div className="admin">
      <aside className="admin-nav" aria-label="Administration">
        <span className="eyebrow">Administration</span>
        <nav>
          <NavLink to="/espace" end>🏠 Tableau de bord</NavLink>
          {LIENS.map(([to, icon, label]) => (
            <NavLink key={to} to={to}>{icon} {label}</NavLink>
          ))}
        </nav>
      </aside>
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}
