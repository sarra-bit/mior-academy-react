import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate, formatHeure, formatPrix } from '../utils/format.js';
import { MODES_PAIEMENT } from '../utils/statuts.js';
import CarteSimulee, { CARTE_VIDE, validerCarte } from '../components/CarteSimulee.jsx';

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

export default function InscriptionSession() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [etape, setEtape] = useState(''); // '', 'traitement', 'accepte'
  const [carte, setCarte] = useState(CARTE_VIDE); // jamais envoyée au serveur
  const [form, setForm] = useState({
    choix_paiement: 'totalite',
    mode_paiement: 'carte',
    reference_paiement: '',
    nom_payeur: user.nom || '',
    prenom_payeur: user.prenom || '',
    email_payeur: user.email || '',
    telephone_payeur: user.telephone || '',
  });

  useEffect(() => {
    api.session(id).then(setSession).catch((e) => setLoadError(e.message));
  }, [id]);

  if (loadError) {
    return (
      <section className="block page">
        <div className="alert alert-error">{loadError}</div>
        <Link to="/sessions" className="btn btn-light">← Retour aux sessions</Link>
      </section>
    );
  }
  if (!session) return <div className="page-state">Chargement…</div>;

  const prix = Number(session.prix);
  const avance = Number(session.montant_avance) || 0;
  const avancePossible = session.type_paiement === 'avance' && avance > 0 && avance < prix;
  const montant = form.choix_paiement === 'avance' && avancePossible ? avance : prix;
  const fermee = !session.a_venir || session.statut !== 'Planifiée' || session.nb_places_restantes <= 0;
  const mode = MODES_PAIEMENT.find((m) => m.value === form.mode_paiement);
  const parCarte = form.mode_paiement === 'carte';
  const needsRef = form.mode_paiement === 'virement' || form.mode_paiement === 'cheque';

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (parCarte) {
      const erreurCarte = validerCarte(carte);
      if (erreurCarte) { setError(erreurCarte); return; }
    }
    setBusy(true);
    try {
      if (parCarte) {
        setEtape('traitement');
        await attendre(1800); // simulation du délai de la banque
      }
      // On n'envoie que les infos d'inscription : la carte reste dans le navigateur
      const { reference_paiement, ...rest } = form;
      const r = await api.inscrire({ ...rest, reference_paiement: parCarte ? '' : reference_paiement, session_id: session.id });
      if (parCarte) {
        setCarte(CARTE_VIDE);
        setEtape('accepte');
        await attendre(1200);
      }
      const ref = r.reference ? ` Référence : ${r.reference}.` : '';
      navigate('/espace/inscriptions', { replace: true, state: { success: `Votre inscription à « ${session.titre} » est enregistrée.${ref}` } });
    } catch (err) {
      setError(err.message);
      setEtape('');
      setBusy(false);
    }
  };

  return (
    <section className="block page">
      <Link to="/sessions" className="back-link">← Sessions disponibles</Link>

      <div className="detail">
        <form className="panel form-panel" onSubmit={submit}>
          <span className="eyebrow">Inscription</span>
          <h1 className="section-title">{session.titre}</h1>

          {fermee && <div className="alert alert-error">Cette session n’est plus ouverte aux inscriptions.</div>}
          {error && <div className="alert alert-error">{error}</div>}

          {avancePossible && (
            <fieldset>
              <legend>Montant à payer</legend>
              <div className="option-grid">
                <label className={`option ${form.choix_paiement === 'totalite' ? 'active' : ''}`}>
                  <input type="radio" name="choix" value="totalite" checked={form.choix_paiement === 'totalite'} onChange={set('choix_paiement')} />
                  <strong>Totalité</strong><span>{formatPrix(prix)}</span>
                </label>
                <label className={`option ${form.choix_paiement === 'avance' ? 'active' : ''}`}>
                  <input type="radio" name="choix" value="avance" checked={form.choix_paiement === 'avance'} onChange={set('choix_paiement')} />
                  <strong>Avance</strong><span>{formatPrix(avance)} maintenant, {formatPrix(prix - avance)} plus tard</span>
                </label>
              </div>
            </fieldset>
          )}

          <fieldset>
            <legend>Mode de paiement</legend>
            <div className="option-grid option-grid-4">
              {MODES_PAIEMENT.map((m) => (
                <label key={m.value} className={`option ${form.mode_paiement === m.value ? 'active' : ''}`}>
                  <input type="radio" name="mode" value={m.value} checked={form.mode_paiement === m.value} onChange={set('mode_paiement')} />
                  <span className="option-icon">{m.icon}</span><strong>{m.label}</strong>
                </label>
              ))}
            </div>
            {!parCarte && <p className="muted small">{mode?.help}</p>}
            {parCarte && <CarteSimulee carte={carte} onChange={setCarte} disabled={busy} />}
            {needsRef && (
              <label>
                {form.mode_paiement === 'virement' ? 'Référence du virement' : 'Numéro du chèque'}
                <input value={form.reference_paiement} onChange={set('reference_paiement')} required maxLength={100} />
              </label>
            )}
          </fieldset>

          <fieldset>
            <legend>Informations du payeur</legend>
            <div className="form-grid">
              <label>Nom<input value={form.nom_payeur} onChange={set('nom_payeur')} required /></label>
              <label>Prénom<input value={form.prenom_payeur} onChange={set('prenom_payeur')} required /></label>
              <label>E-mail<input type="email" value={form.email_payeur} onChange={set('email_payeur')} required /></label>
              <label>Téléphone<input value={form.telephone_payeur} onChange={set('telephone_payeur')} required pattern="[0-9]{8}" inputMode="numeric" title="8 chiffres" /></label>
            </div>
          </fieldset>

          <button className="btn btn-gold btn-block" disabled={busy || fermee}>
            {busy
              ? 'Enregistrement…'
              : parCarte ? `Payer ${formatPrix(montant)}` : `Confirmer l’inscription · ${formatPrix(montant)}`}
          </button>

          {etape && (
            <div className="paiement-overlay" role="status" aria-live="polite">
              <div className="paiement-box">
                {etape === 'traitement' ? (
                  <><span className="spinner" /><strong>Paiement en cours…</strong><span className="muted small">Connexion à la banque (simulation)</span></>
                ) : (
                  <><span className="paiement-ok">✓</span><strong>Paiement accepté</strong><span className="muted small">{formatPrix(montant)} · simulation</span></>
                )}
              </div>
            </div>
          )}
          <p className="muted small">Votre inscription sera confirmée par l’administration après vérification du paiement.</p>
        </form>

        <aside className="detail-side">
          <span className="muted small">Récapitulatif</span>
          <strong>{session.titre}</strong>
          <ul className="facts">
            <li><span>Date</span><strong>{formatDate(session.date_session)}</strong></li>
            <li><span>Horaire</span><strong>{formatHeure(session.heure_debut)} – {formatHeure(session.heure_fin)}</strong></li>
            {session.salle && <li><span>Salle</span><strong>{session.salle}</strong></li>}
            {session.formateur_nom && <li><span>Formateur</span><strong>{session.formateur_prenom} {session.formateur_nom}</strong></li>}
            <li><span>Places restantes</span><strong>{session.nb_places_restantes}</strong></li>
            <li><span>Prix de la formation</span><strong>{formatPrix(prix)}</strong></li>
          </ul>
          <div className="total"><span>À payer maintenant</span><strong>{formatPrix(montant)}</strong></div>
        </aside>
      </div>
    </section>
  );
}
