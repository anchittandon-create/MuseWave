/** @jsxImportSource react */
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  username: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hardcoded credentials as requested
const CREDENTIALS = {
  username: 'Anchit',
  password: 'AnchitAnya',
};

const AUTH_STORAGE_KEY = 'musewave_auth_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [username, setUsername] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`${AUTH_STORAGE_KEY}_user`);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (isAuthenticated) {
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        localStorage.setItem(`${AUTH_STORAGE_KEY}_user`, username || '');
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(`${AUTH_STORAGE_KEY}_user`);
      }
    } catch (e) {
      console.warn('Failed to persist auth state:', e);
    }
  }, [isAuthenticated, username]);

  const login = (inputUsername: string, inputPassword: string): boolean => {
    if (inputUsername === CREDENTIALS.username && inputPassword === CREDENTIALS.password) {
      setIsAuthenticated(true);
      setUsername(inputUsername);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, username }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}