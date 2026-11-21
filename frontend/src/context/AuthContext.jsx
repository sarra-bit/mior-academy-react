import { createContext, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  // Au chargement : si un token existe, on récupère l'utilisateur
  useEffect(() => {
    if (!tokenStore.get()) return;
    api.me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const saveSession = ({ token, user: u }) => {
    tokenStore.set(token);
    setUser(u);
    return u;
  };

  const value = {
    user,
    setUser,
    loading,
    login: async (email, motdepasse) => saveSession(await api.login(email, motdepasse)),
    register: async (form) => saveSession(await api.register(form)),
    logout: () => {
      tokenStore.clear();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
