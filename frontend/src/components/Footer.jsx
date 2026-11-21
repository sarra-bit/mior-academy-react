import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <div style={{ marginBottom: 18 }}>
              <Logo />
            </div>
            <p>Des formations modernes pour construire votre avenir professionnel avec confiance et compétence.</p>
          </div>
          <div>
            <h4>Contact</h4>
            <p>Tunis, Tunisie</p>
            <p>+216 12 345 678</p>
            <p>contact@mioracademy.tn</p>
          </div>
          <div>
            <h4>Accès rapide</h4>
            <Link to="/espace">Espace Personnel</Link>
            <Link to="/connexion">Se connecter</Link>
            <Link to="/inscription">S'inscrire</Link>
            <Link to="/verifier">Vérifier une attestation</Link>
          </div>
          <div>
            <h4>Formations</h4>
            <Link to="/formations?departement=Informatique">Informatique</Link>
            <Link to="/formations?departement=Marketing%20%26%20Digital">Marketing &amp; Digital</Link>
            <Link to="/formations?departement=Langues">Langues</Link>
            <Link to="/formations?departement=Design%20%26%20Multim%C3%A9dia">Design &amp; Multimédia</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} M.I.O.R Academy — Tous droits réservés.</span>
          <span>Tunis · Tunisie</span>
        </div>
      </div>
    </footer>
  );
}
