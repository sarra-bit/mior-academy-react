export const formatPrix = (v) =>
  `${Number(v || 0).toLocaleString('fr-TN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} DT`;

export const formatDate = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }) : '';

export const formatHeure = (h) => (h ? h.slice(0, 5) : '');

// Icône et couleur par département (comme sur l'ancien site)
export const DEPARTEMENTS = {
  Informatique: { icon: '🖥️', tone: 'blue', text: 'Développement web, bureautique, maintenance, réseaux et outils digitaux.' },
  'Marketing & Digital': { icon: '📈', tone: 'green', text: 'Community management, Facebook Ads, Google Ads, SEO et stratégie digitale.' },
  Langues: { icon: '🌍', tone: 'purple', text: 'Français, anglais, allemand et communication professionnelle pour tous niveaux.' },
  'Design & Multimédia': { icon: '🎨', tone: 'orange', text: 'Illustrator, Photoshop, montage vidéo, création visuelle et UI/UX design.' },
};

export const deptInfo = (nom) => DEPARTEMENTS[nom] || { icon: '📘', tone: 'blue', text: '' };
