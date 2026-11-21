import { NavLink, Outlet } from 'react-router-dom';

const LIENS = [
  ['/formateur/sessions', '🗓️', 'Mes sessions & appel'],
  ['/formateur/disponibilites', '⏰', 'Mes disponibilités'],
  ['/formateur/formations', '📚', 'Mes formations'],
  ['/formateur/messages', '💬', 'Messages'],
  ['/formateur/attestations', '🎓', 'Mes attestations'],
  ['/espace/profil', '👤', 'Mon profil'],
];

export default function FormateurLayout() {
  return (
    <div className="admin">
      <aside className="admin-nav" aria-label="Espace formateur">
        <span className="eyebrow">Espace formateur</span>
        <nav>
          <NavLink to="/espace" end>🏠 Tableau de bord</NavLink>
          {LIENS.map(([to, icon, label]) => <NavLink key={to} to={to}>{icon} {label}</NavLink>)}
        </nav>
      </aside>
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}
