import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';
import { api } from '../services/api.js';

// Nombre de messages non lus (participant / formateur), rafraîchi toutes les 30 s
function useNonLus(user) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!user || user.role === 'admin') { setN(0); return undefined; }
    const charger = () => { if (!document.hidden) api.messages.get('/non-lus').then((r) => setN(r.count)).catch(() => {}); };
    charger();
    const id = setInterval(charger, 30000);
    window.addEventListener('mior:messages', charger);
    return () => { clearInterval(id); window.removeEventListener('mior:messages', charger); };
  }, [user]);
  return n;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const nonLus = useNonLus(user);

  const close = () => setOpen(false);
  const handleLogout = () => {
    logout();
    close();
    navigate('/');
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-inner">
          <div>📍 Tunis, Tunisie &nbsp;·&nbsp; ✉️ contact@mioracademy.tn</div>
          <div className="topbar-right">
            {user ? (
              <span>Bonjour, {user.prenom}</span>
            ) : (
              <>
                <Link to="/connexion">Espace Personnel</Link>
                <Link to="/inscription">S'inscrire</Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="nav-wrap">
        <nav className="navbar">
          <Logo />
          <button
            className="nav-toggle"
            aria-label="Ouvrir le menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            ☰
          </button>
          <div className={`nav-links ${open ? 'open' : ''}`}>
            <NavLink to="/" end onClick={close}>Accueil</NavLink>
            <NavLink to="/formations" onClick={close}>Formations</NavLink>
            <NavLink to="/sessions" end onClick={close}>Sessions</NavLink>
            <Link to="/#apropos" onClick={close}>À propos</Link>
            <Link to="/#pourquoi" onClick={close}>Pourquoi nous</Link>
            {user ? (
              <>
                <NavLink to="/espace" end onClick={close}>Mon espace</NavLink>
                {user.role === 'admin' && <NavLink to="/admin" onClick={close}>Administration</NavLink>}
                {user.role === 'formateur' && <NavLink to="/formateur/sessions" onClick={close}>Mes sessions</NavLink>}
                {user.role !== 'admin' && (
                  <NavLink to={user.role === 'formateur' ? '/formateur/messages' : '/espace/messages'} onClick={close} aria-label={nonLus ? `Messages, ${nonLus} non lus` : 'Messages'}>
                    Messages{nonLus > 0 && <span className="badge">{nonLus}</span>}
                  </NavLink>
                )}
                <button className="btn btn-light" onClick={handleLogout}>Déconnexion</button>
              </>
            ) : (
              <Link to="/connexion" className="btn btn-gold" onClick={close}>Se connecter</Link>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
