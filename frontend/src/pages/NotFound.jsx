import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="block page page-center">
      <span className="eyebrow">Erreur 404</span>
      <h1 className="section-title">Page introuvable</h1>
      <p className="section-subtitle">La page que vous cherchez n’existe pas ou a été déplacée.</p>
      <Link to="/" className="btn btn-primary">Retour à l’accueil</Link>
    </section>
  );
}
