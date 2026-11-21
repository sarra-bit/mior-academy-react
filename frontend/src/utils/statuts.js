// Libellés et couleurs des statuts d'inscription / de paiement
export const STATUT_INSCRIPTION = {
  en_attente: { label: 'En attente', cls: 'tag-wait' },
  confirmee: { label: 'Confirmée', cls: 'tag-live' },
  refusee: { label: 'Refusée', cls: 'tag-full' },
};

export const STATUT_PAIEMENT = {
  en_attente: { label: 'Paiement en attente', cls: 'tag-wait' },
  avance_payee: { label: 'Avance payée', cls: 'tag-info' },
  paye: { label: 'Payé', cls: 'tag-live' },
  refuse: { label: 'Paiement refusé', cls: 'tag-full' },
};

export const MODES_PAIEMENT = [
  { value: 'carte', label: 'Carte bancaire', icon: '💳', help: 'Paiement simulé pour la démonstration : aucune donnée de carte n’est envoyée ni enregistrée.' },
  { value: 'virement', label: 'Virement bancaire', icon: '🏦', help: 'Effectuez le virement puis indiquez sa référence.' },
  { value: 'especes', label: 'Espèces au centre', icon: '💵', help: 'Payez à l’accueil du centre avant le début de la session.' },
  { value: 'cheque', label: 'Chèque', icon: '🧾', help: 'Déposez le chèque au centre et indiquez son numéro.' },
];
