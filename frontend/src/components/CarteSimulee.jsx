// Formulaire de carte bancaire SIMULÉ (projet pédagogique).
// Les valeurs restent dans l'état React de ce composant : elles ne sont jamais
// envoyées au serveur ni enregistrées (ni localStorage, ni base de données).

export const CARTE_VIDE = { nom: '', numero: '', expiration: '', cvv: '' };

// Algorithme de Luhn : vérifie qu'un numéro de carte est bien formé
function luhn(num) {
  let sum = 0;
  let double = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (double) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    double = !double;
  }
  return num.length >= 13 && sum % 10 === 0;
}

export function validerCarte(c) {
  const numero = c.numero.replace(/\s/g, '');
  if (!c.nom.trim()) return 'Indiquez le nom du titulaire de la carte.';
  if (!luhn(numero)) return 'Le numéro de carte n’est pas valide.';
  const m = /^(\d{2})\/(\d{2})$/.exec(c.expiration);
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return 'La date d’expiration doit être au format MM/AA.';
  const fin = new Date(2000 + Number(m[2]), Number(m[1]), 0, 23, 59);
  if (fin < new Date()) return 'Cette carte est expirée.';
  if (!/^\d{3}$/.test(c.cvv)) return 'Le CVV doit contenir 3 chiffres.';
  return '';
}

const marque = (num) => {
  if (/^4/.test(num)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(num)) return 'Mastercard';
  return '';
};

export default function CarteSimulee({ carte, onChange, disabled }) {
  const numero = carte.numero.replace(/\s/g, '');

  const set = (field, value) => onChange({ ...carte, [field]: value });
  const onNumero = (e) => set('numero', e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '));
  const onExpiration = (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
    set('expiration', v);
  };

  const affichage = (numero.padEnd(16, '•').match(/.{1,4}/g) || []).join(' ');

  return (
    <div className="carte-zone">
      <div className="carte-visuel" aria-hidden="true">
        <div className="carte-top">
          <span className="carte-puce" />
          <span className="carte-marque">{marque(numero)}</span>
        </div>
        <div className="carte-numero">{affichage}</div>
        <div className="carte-bas">
          <div><small>Titulaire</small><span>{carte.nom.trim() || 'NOM PRÉNOM'}</span></div>
          <div><small>Expire</small><span>{carte.expiration || 'MM/AA'}</span></div>
        </div>
      </div>

      <div className="carte-champs">
        <label className="span-2">
          Nom du titulaire
          <input value={carte.nom} onChange={(e) => set('nom', e.target.value.toUpperCase())} disabled={disabled} autoComplete="off" />
        </label>
        <label className="span-2">
          Numéro de carte
          <input value={carte.numero} onChange={onNumero} inputMode="numeric" placeholder="4242 4242 4242 4242" disabled={disabled} autoComplete="off" />
        </label>
        <label>
          Expiration
          <input value={carte.expiration} onChange={onExpiration} inputMode="numeric" placeholder="MM/AA" disabled={disabled} autoComplete="off" />
        </label>
        <label>
          CVV
          <input value={carte.cvv} onChange={(e) => set('cvv', e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" placeholder="123" disabled={disabled} autoComplete="off" />
        </label>
      </div>

      <p className="carte-note">
        🔒 Paiement <strong>simulé</strong> pour la démonstration. Utilisez une carte de test, par exemple
        <code> 4242 4242 4242 4242</code>. Aucune donnée de carte n’est envoyée au serveur.
      </p>
    </div>
  );
}
