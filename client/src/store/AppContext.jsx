import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      const data = await api('/api/site');
      setSettings(data.settings || {});
    } catch (_) {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await api('/api/auth/me');
        if (mounted) setUser(data.user);
      } catch (_) {
        /* not logged in */
      }
      try {
        const data = await api('/api/customer/me');
        if (mounted) setCustomer(data.user);
      } catch (_) {
        /* not a customer session */
      }
      if (mounted) {
        await refreshSettings();
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [refreshSettings]);

  const login = useCallback(async (username, password, code) => {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, code: code || '' })
    });
    if (data.user) setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch (_) {
      /* ignore */
    }
    setUser(null);
  }, []);

  const refreshCustomer = useCallback(async () => {
    try {
      const data = await api('/api/customer/me');
      setCustomer(data.user);
    } catch (_) {
      setCustomer(null);
    }
  }, []);

  const customerLogin = useCallback(async (email, password) => {
    const data = await api('/api/customer/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.user) setCustomer(data.user);
    return data;
  }, []);

  const customerRegister = useCallback(async (name, email, password, extra = {}) => {
    const data = await api('/api/customer/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, ...extra })
    });
    if (data.user) setCustomer(data.user);
    return data;
  }, []);

  const customerLogout = useCallback(async () => {
    try {
      await api('/api/customer/logout', { method: 'POST' });
    } catch (_) {
      /* ignore */
    }
    setCustomer(null);
  }, []);

  return (
    <AppContext.Provider value={{
      user, customer, settings, loading,
      login, logout,
      customerLogin, customerRegister, customerLogout, refreshCustomer,
      refreshSettings
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
