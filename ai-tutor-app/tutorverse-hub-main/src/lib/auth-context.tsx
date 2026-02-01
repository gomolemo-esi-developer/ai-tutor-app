/**
 * Auth Context - JWT Token Management
 * Minimal implementation for storing and managing authentication tokens
 * 
 * Usage:
 *   const { token, setToken, clearToken } = useAuth();
 *   setToken(jwtFromLogin);
 *   clearToken(); // on logout
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from './api';

interface AuthContextType {
  token: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(null);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setTokenState(storedToken);
      apiClient.setToken(storedToken);
    }
  }, []);

  const setToken = (newToken: string) => {
    setTokenState(newToken);
    localStorage.setItem('authToken', newToken);
    apiClient.setToken(newToken);
  };

  const clearToken = () => {
    setTokenState(null);
    localStorage.removeItem('authToken');
    apiClient.clearToken();
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        setToken,
        clearToken,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
