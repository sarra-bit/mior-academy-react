import { useCallback, useState } from 'react';

// Petit message de succès / erreur affiché en haut des pages admin
export default function useFlash() {
  const [flash, setFlash] = useState({ type: '', text: '' });
  const ok = useCallback((text) => setFlash({ type: 'success', text }), []);
  const fail = useCallback((text) => setFlash({ type: 'error', text }), []);
  const clear = useCallback(() => setFlash({ type: '', text: '' }), []);
  const Flash = () =>
    flash.text ? (
      <div className={`alert alert-${flash.type} flash`} role="status">
        {flash.text}
        <button onClick={clear} aria-label="Fermer le message">×</button>
      </div>
    ) : null;
  return { ok, fail, clear, Flash };
}
