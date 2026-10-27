import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export const STORAGE_KEY = 'gsap-app.user';

// sessionStorage can throw (privacy mode, blocked storage); fall back to memory.
function readStoredUser() {
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    return value && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

function writeStoredUser(value) {
  try {
    if (value === null) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(STORAGE_KEY, value);
    }
  } catch {
    // In-memory state still holds the user.
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  // Mock sign-in: any non-empty credentials succeed; nothing leaves the browser.
  const login = useCallback((username, password) => {
    const name = String(username ?? '').trim();
    const pass = String(password ?? '').trim();
    if (!name || !pass) return false;
    writeStoredUser(name);
    setUser(name);
    return true;
  }, []);

  const logout = useCallback(() => {
    writeStoredUser(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
