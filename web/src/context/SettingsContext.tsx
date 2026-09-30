import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { getStoredToken, setStoredToken, clearStoredToken } from '../api/client';

export interface SettingsContextValue {
  token: string;
  setToken: (value: string) => void;
  clearToken: () => void;
  hasToken: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string>(getStoredToken);

  const setToken = useCallback((value: string) => {
    setStoredToken(value);
    setTokenState(getStoredToken());
  }, []);

  const clearToken = useCallback(() => {
    clearStoredToken();
    setTokenState('');
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        token,
        setToken,
        clearToken,
        hasToken: token.length > 0,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings deve ser usado dentro de SettingsProvider');
  return ctx;
}
