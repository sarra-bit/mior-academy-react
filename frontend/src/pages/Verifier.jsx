import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { formatDate, formatHeure } from '../utils/format.js';

// Page publique ouverte par le QR code imprimé sur l'attestation
export default function Verifier() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [saisie, setSaisie] = useState(code || '');
  const [etat, setEtat] = useState(code ? 'chargement' : 'vide');
  const [att, setAtt] = useState(null);

  useEffect(() => {
    if (!code) { setEtat('vide'); setAtt(null); return; }
    setSaisie(code);
    setEtat('chargement');
    api.verifierAttestation(code)
      .then((d) => { setAtt(d); setEtat('valide'); })
      .catch((e) => { setAtt(null); setEtat(e.status === 404 ? 'invalide' : 'erreur'); });
  }, [code]);

  const submit = (e) => {
    e.preventDefault();
    const c = saisie.trim().toUpperCase();
    if (c) navigate(`/verifier/${encodeURIComponent(c)}`);
  };

  return (
    <section className="block page verify">
      <div className="verify-card">
        <span className="eyebrow">Authenticité</span>
        <h1 className="section-title">Vérifier une attestation</h1>
        <p className="muted">Scannez le QR code de l’attestation ou saisissez le code imprimé en bas à gauche.</p>

        <form className="verify-form" onSubmit={submit}>
          <label htmlFor="code" className="sr-only">Code de l’attestation</label>
          <input id="code" value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="ATT-XXXXXXXXXXXX" autoComplete="off" spellCheck="false" />
          <button className="btn btn-primary" type="submit">Vérifier</button>
        </form>

        {etat === 'chargement' && <div className="page-state">Vérification…</div>}
        {etat === 'erreur' && <div className="alert alert-error">Le service de vérification est indisponible. Réessayez plus tard.</div>}
        {etat === 'invalide' && (
          <div className="verify-result verify-ko" role="status">
            <strong>✕ Attestation introuvable</strong>
            <p>Aucune attestation valide ne correspond au code <code>{code}</code>. Elle a pu être révoquée, ou le code est mal saisi.</p>
          </div>
        )}
        {etat === 'valide' && att && (
          <div className="verify-result verify-ok" role="status">
            <strong>✓ Attestation authentique</strong>
            <p>Délivrée par M.I.O.R Academy le {formatDate(att.date_generation.slice(0, 10))}.</p>
            <dl className="verify-dl">
              <dt>Bénéficiaire</dt><dd>{att.beneficiaire}</dd>
              <dt>Type</dt><dd>{att.type === 'formateur' ? 'Animation (formateur)' : 'Participation'}</dd>
              <dt>Formation</dt><dd>{att.formation}{att.departement && <span className="muted"> · {att.departement}</span>}</dd>
              <dt>Session</dt><dd>{formatDate(att.date_session)} · {formatHeure(att.heure_debut)} – {formatHeure(att.heure_fin)}</dd>
              {att.formateur && att.type === 'participant' && <><dt>Formateur</dt><dd>{att.formateur}</dd></>}
              <dt>Code</dt><dd><code>{att.code_unique}</code></dd>
            </dl>
          </div>
        )}
      </div>
    </section>
  );
}
