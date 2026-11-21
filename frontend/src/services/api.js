// Toutes les requêtes vers le backend passent par ici.
const TOKEN_KEY = 'mior_token';

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t) => {
    try { localStorage.setItem(TOKEN_KEY, t); } catch { /* stockage indisponible */ }
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* stockage indisponible */ }
  },
};

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || `Erreur ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return data;
}

// Téléchargement d'un fichier protégé (PDF…) : le token ne peut pas passer par un simple lien
async function download(path, filename) {
  const token = tokenStore.get();
  const res = await fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Erreur ${res.status}`);
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const verbes = (base) => ({
  get: (path = '') => request(`${base}${path}`),
  post: (path, body) => request(`${base}${path}`, { method: 'POST', body: body || {} }),
  put: (path, body) => request(`${base}${path}`, { method: 'PUT', body }),
  patch: (path, body) => request(`${base}${path}`, { method: 'PATCH', body: body || {} }),
  del: (path) => request(`${base}${path}`, { method: 'DELETE' }),
});

export const api = {
  // --- Attestations, messagerie, alertes ---
  verifierAttestation: (code) => request(`/api/attestations/verifier/${encodeURIComponent(code)}`),
  mesAttestations: () => request('/api/attestations/mes'),
  telechargerAttestation: (a) => download(`/api/attestations/${a.id}/pdf`, `attestation_${a.code_unique}.pdf`),
  messages: verbes('/api/messages'),
  alertes: verbes('/api/alertes'),

  login: (email, motdepasse) => request('/api/auth/login', { method: 'POST', body: { email, motdepasse } }),
  register: (form) => request('/api/auth/register', { method: 'POST', body: form }),
  me: () => request('/api/auth/me'),

  formations: (filters = {}) => {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
    return request(`/api/formations${qs ? `?${qs}` : ''}`);
  },
  categories: () => request('/api/formations/categories'),
  formation: (id) => request(`/api/formations/${id}`),
  sessionsDisponibles: () => request('/api/sessions/disponibles'),
  session: (id) => request(`/api/sessions/${id}`),

  dashboard: () => request('/api/dashboard'),

  mesInscriptions: () => request('/api/inscriptions/mes'),
  inscrire: (data) => request('/api/inscriptions', { method: 'POST', body: data }),
  annulerInscription: (id) => request(`/api/inscriptions/${id}`, { method: 'DELETE' }),

  profil: () => request('/api/profile'),
  updateProfil: (data) => request('/api/profile', { method: 'PUT', body: data }),
  changePassword: (data) => request('/api/profile/password', { method: 'PUT', body: data }),

  // --- Formateur ---
  formateur: {
    get: (path) => request(`/api/formateur${path}`),
    post: (path, body) => request(`/api/formateur${path}`, { method: 'POST', body: body || {} }),
    put: (path, body) => request(`/api/formateur${path}`, { method: 'PUT', body }),
    patch: (path, body) => request(`/api/formateur${path}`, { method: 'PATCH', body: body || {} }),
    del: (path) => request(`/api/formateur${path}`, { method: 'DELETE' }),
  },

  // --- Administration ---
  admin: {
    get: (path) => request(`/api/admin${path}`),
    post: (path, body) => request(`/api/admin${path}`, { method: 'POST', body: body || {} }),
    put: (path, body) => request(`/api/admin${path}`, { method: 'PUT', body }),
    patch: (path, body) => request(`/api/admin${path}`, { method: 'PATCH', body }),
    del: (path) => request(`/api/admin${path}`, { method: 'DELETE' }),
  },
};
