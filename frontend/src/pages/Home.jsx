import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { DEPARTEMENTS, deptInfo } from '../utils/format.js';
import { useAuth } from '../context/AuthContext.jsx';

const RAISONS = [
  ['Formateurs certifiés', 'Une équipe compétente avec une solide expérience terrain et pédagogique.'],
  ['Formation flexible', 'Des programmes adaptés aux étudiants, salariés et chercheurs d’emploi.'],
  ['Certifications reconnues', 'Des attestations valorisantes qui renforcent votre profil professionnel.'],
  ['Suivi personnalisé', 'Un accompagnement avant, pendant et après la formation pour mieux réussir.'],
];

export default function Home() {
  const { user } = useAuth();
  const [departements, setDepartements] = useState(
    Object.keys(DEPARTEMENTS).map((nom) => ({ nom, total: null }))
  );

  useEffect(() => {
    api.categories().then((d) => d.length && setDepartements(d)).catch(() => {});
  }, []);

  const totalFormations = departements.reduce((s, d) => s + (d.total || 0), 0);

  return (
    <>
      <header className="hero">
        <div className="hero-badge"><span className="dot" /> Sessions ouvertes — Promotion {new Date().getFullYear()}</div>
        <h1>
          Formez-vous. <em>Avancez.</em>
          <br />
          Construisez votre avenir.
        </h1>
        <p className="lede">
          Rejoignez M.I.O.R Academy, un centre de formation à taille humaine où l’on apprend en faisant.
          Informatique, marketing digital, langues et design — des parcours certifiants pensés pour le marché du travail.
        </p>
        <div className="hero-buttons">
          {user ? (
            <Link to="/espace" className="btn btn-gold">Accéder à mon espace</Link>
          ) : (
            <Link to="/inscription" className="btn btn-gold">S’inscrire maintenant</Link>
          )}
          <Link to="/formations" className="btn btn-light">Découvrir nos formations</Link>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><h3>{totalFormations ? `${totalFormations}+` : '20+'}</h3><p>Formations pratiques</p></div>
          <div className="hero-stat"><h3>100%</h3><p>Approche orientée compétences</p></div>
          <div className="hero-stat"><h3>∞</h3><p>Opportunités d’évolution</p></div>
        </div>
      </header>

      <div className="trustbar">
        <span className="label">Reconnu par</span>
        <span className="pill">Ministère de la Formation</span>
        <span className="pill">Centres partenaires</span>
        <span className="pill">Entreprises locales</span>
        <span className="pill">Réseau Alumni 2 000+</span>
      </div>

      <section className="block" id="formations">
        <div className="formations-wrap">
          <div className="section-head">
            <h2 className="section-title">Nos formations</h2>
            <p className="section-subtitle">
              Découvrez des parcours modernes, utiles et accessibles, pensés pour répondre aux besoins réels du marché du travail.
            </p>
          </div>
          <div className="cards">
            {departements.map((d) => {
              const info = deptInfo(d.nom);
              return (
                <div key={d.nom} className={`program-card tone-${info.tone}`}>
                  <div className="program-icon">{info.icon}</div>
                  <h3>{d.nom}</h3>
                  <p>{info.text}</p>
                  {d.total != null && <span className="program-count">{d.total} formation{d.total > 1 ? 's' : ''}</span>}
                  <Link to={`/formations?departement=${encodeURIComponent(d.nom)}`}>Voir les formations</Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="block" id="apropos">
        <div className="about">
          <div className="about-image">
            <img src="/images/about.jpg.png" alt="Notre centre de formation" />
          </div>
          <div>
            <span className="eyebrow">À propos</span>
            <h2 className="section-title">Un centre humain, exigeant, proche du terrain.</h2>
            <p className="section-subtitle">
              M.I.O.R Academy accompagne étudiants, diplômés et professionnels qui souhaitent acquérir des compétences
              concrètes, utiles et reconnues. Nous croyons à une formation où chacun progresse à son rythme, avec un
              accompagnement réel.
            </p>
            <ul className="about-list">
              <li><span className="check">✓</span> Formateurs qualifiés issus du monde professionnel</li>
              <li><span className="check">✓</span> Formations pratiques et certifiantes</li>
              <li><span className="check">✓</span> Horaires flexibles adaptés à tous les profils</li>
              <li><span className="check">✓</span> Accompagnement personnalisé jusqu’à l’insertion</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="block" id="pourquoi">
        <div className="section-head">
          <span className="eyebrow">Pourquoi nous choisir</span>
          <h2 className="section-title">Quatre raisons d’apprendre avec nous.</h2>
          <p className="section-subtitle">
            Une pédagogie moderne, un suivi personnalisé et des formations proches de la réalité professionnelle.
          </p>
        </div>
        <div className="why-grid">
          {RAISONS.map(([titre, texte], i) => (
            <div key={titre} className="why-card">
              <div className="why-num">{String(i + 1).padStart(2, '0')}</div>
              <h4>{titre}</h4>
              <p>{texte}</p>
            </div>
          ))}
        </div>
      </section>

      {!user && (
        <section className="cta">
          <div className="cta-inner">
            <div>
              <h3>Prêt à démarrer votre formation ?</h3>
              <p>Inscrivez-vous en quelques minutes et accédez à votre espace personnel pour suivre vos sessions, attestations et messages.</p>
            </div>
            <div className="cta-actions">
              <Link to="/inscription" className="btn btn-gold">Créer mon compte</Link>
              <Link to="/connexion" className="btn btn-outline">J’ai déjà un compte</Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
