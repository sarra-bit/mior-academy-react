import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const POLL_CHAT = 4000;   // nouveaux messages de la conversation ouverte
const POLL_LISTE = 12000; // liste des conversations (non lus)
const MAX = 2000;

const heure = (d) => {
  const date = new Date(String(d).replace(' ', 'T'));
  const memeJour = date.toDateString() === new Date().toDateString();
  return memeJour
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};
const initiales = (p, n) => `${(p || '?')[0]}${(n || '')[0] || ''}`.toUpperCase();

// Exécute fn toutes les ms millisecondes quand l'onglet est visible
function usePolling(fn, ms, deps) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) ref.current(); }, ms);
    return () => clearInterval(id);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

export default function Messages() {
  const { user } = useAuth();
  const { id } = useParams();
  const convId = Number(id) || null;
  const navigate = useNavigate();
  const base = user.role === 'formateur' ? '/formateur/messages' : '/espace/messages';

  const [convs, setConvs] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [error, setError] = useState('');

  const chargerListe = () => api.messages.get('/conversations')
    .then((l) => { setConvs(l); window.dispatchEvent(new Event('mior:messages')); }) // met à jour le badge du menu
    .catch((e) => setError(e.message));
  useEffect(() => {
    chargerListe();
    if (user.role === 'participant') api.messages.get('/contacts').then(setContacts).catch(() => {});
  }, []);
  usePolling(chargerListe, POLL_LISTE, []);

  const ouvrirAvec = async (formateurId) => {
    if (!formateurId) return;
    try {
      const r = await api.messages.post('/conversations', { formateur_id: Number(formateurId) });
      await chargerListe();
      navigate(`${base}/${r.id}`);
    } catch (e) { setError(e.message); }
  };

  // Formateurs sans conversation existante
  const nouveaux = contacts.filter((c) => !(convs || []).some((v) => v.autre_id === c.id));

  const page = (
    <>
      <div className="admin-head">
        <div>
          <h1 className="section-title">Messages</h1>
          <p className="muted">
            {user.role === 'participant'
              ? 'Échangez avec les formateurs de vos sessions.'
              : 'Les questions de vos participants.'}
          </p>
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className={`chat ${convId ? 'chat-open' : ''}`}>
        <aside className="chat-list" aria-label="Conversations">
          {user.role === 'participant' && (
            <div className="chat-new">
              <label htmlFor="nouveau" className="small muted">Nouveau message</label>
              <select id="nouveau" value="" onChange={(e) => ouvrirAvec(e.target.value)} disabled={nouveaux.length === 0}>
                <option value="">{nouveaux.length ? 'Choisir un formateur…' : contacts.length ? 'Tous vos formateurs sont déjà dans la liste' : 'Aucun formateur (inscrivez-vous à une session)'}</option>
                {nouveaux.map((c) => (
                  <option key={c.id} value={c.id}>{c.prenom} {c.nom} — {c.formations}</option>
                ))}
              </select>
            </div>
          )}
          {!convs && <p className="muted small chat-pad">Chargement…</p>}
          {convs && convs.length === 0 && <p className="muted small chat-pad">Aucune conversation pour l’instant.</p>}
          {(convs || []).map((c) => (
            <Link key={c.id} to={`${base}/${c.id}`} className={`chat-item ${c.id === convId ? 'active' : ''}`}>
              <span className="avatar">{initiales(c.autre_prenom, c.autre_nom)}</span>
              <span className="chat-item-body">
                <span className="chat-item-top">
                  <strong>{c.autre_prenom} {c.autre_nom}</strong>
                  <span className="muted small">{heure(c.derniere_activite)}</span>
                </span>
                <span className="chat-item-last muted small">
                  {c.dernier_message || (c.dernier_fichier ? '📎 Pièce jointe' : 'Nouvelle conversation')}
                </span>
              </span>
              {Number(c.non_lus) > 0 && <span className="badge" aria-label={`${c.non_lus} non lus`}>{c.non_lus}</span>}
            </Link>
          ))}
        </aside>

        {convId
          ? <Conversation key={convId} id={convId} me={user.id} base={base} onChange={chargerListe} />
          : (
            <div className="chat-empty">
              <span>💬</span>
              <p className="muted">Sélectionnez une conversation{user.role === 'participant' ? ' ou écrivez à un formateur' : ''}.</p>
            </div>
          )}
      </div>
    </>
  );

  return user.role === 'formateur' ? page : <section className="block page">{page}</section>;
}

function Conversation({ id, me, base, onChange }) {
  const [info, setInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [error, setError] = useState('');
  const fil = useRef(null);
  const dernier = useRef(0);

  const charger = async (initial = false) => {
    try {
      const r = await api.messages.get(`/conversations/${id}/messages${initial ? '' : `?after=${dernier.current}`}`);
      if (initial) setInfo(r.conversation);
      if (r.messages.length) {
        dernier.current = r.messages[r.messages.length - 1].id;
        setMessages((m) => (initial ? r.messages : [...m, ...r.messages.filter((n) => !m.some((x) => x.id === n.id))]));
        if (!initial) onChange();
      }
      setError('');
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { charger(true).then(onChange); }, [id]);
  usePolling(() => charger(false), POLL_CHAT, [id]);

  // Toujours afficher le dernier message
  useEffect(() => { if (fil.current) fil.current.scrollTop = fil.current.scrollHeight; }, [messages.length]);

  const envoyer = async (e) => {
    e.preventDefault();
    const t = texte.trim();
    if (!t || envoi) return;
    setEnvoi(true);
    try {
      const m = await api.messages.post(`/conversations/${id}/messages`, { message: t });
      dernier.current = Math.max(dernier.current, m.id);
      setMessages((list) => [...list, m]);
      setTexte('');
      onChange();
    } catch (err) { setError(err.message); } finally { setEnvoi(false); }
  };

  const touche = (e) => { if (e.key === 'Enter' && !e.shiftKey) envoyer(e); };

  return (
    <section className="chat-pane" aria-label="Conversation">
      <header className="chat-head">
        <Link to={base} className="chat-back" aria-label="Retour aux conversations">←</Link>
        {info ? (
          <>
            <span className="avatar">{initiales(info.autre.prenom, info.autre.nom)}</span>
            <div>
              <strong>{info.autre.prenom} {info.autre.nom}</strong>
              <div className="muted small">{info.autre.role === 'formateur' ? 'Formateur' : 'Participant'}</div>
            </div>
          </>
        ) : <span className="muted">Chargement…</span>}
      </header>

      <div className="chat-thread" ref={fil} aria-live="polite">
        {info && messages.length === 0 && <p className="muted small center">Aucun message. Écrivez le premier !</p>}
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.sender_id === me ? 'bubble-me' : ''}`}>
            {m.message && <p>{m.message}</p>}
            {!!m.a_fichier && <p className="muted small">📎 Pièce jointe de l’ancien site (non reprise)</p>}
            <span className="bubble-time">{heure(m.created_at)}</span>
          </div>
        ))}
      </div>

      {error && <div className="alert alert-error chat-error">{error}</div>}
      <form className="chat-form" onSubmit={envoyer}>
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value.slice(0, MAX))}
          onKeyDown={touche}
          placeholder="Votre message… (Entrée pour envoyer, Maj+Entrée pour un retour à la ligne)"
          rows={2}
          aria-label="Votre message"
        />
        <button className="btn btn-gold" type="submit" disabled={envoi || !texte.trim()}>{envoi ? '…' : 'Envoyer'}</button>
      </form>
    </section>
  );
}
