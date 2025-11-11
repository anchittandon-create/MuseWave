import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AppVersion = 'complete' | 'oss';

type AppVersionContextValue = {
  version: AppVersion;
  setVersion: (value: AppVersion) => void;
};

const STORAGE_KEY = 'musewave_app_version';

const AppVersionContext = createContext<AppVersionContextValue | undefined>(undefined);

const mapStoredValue = (value: string | null): AppVersion | null => {
  if (value === 'complete' || value === 'oss') return value;
  if (value === 'current') return 'complete';
  return null;
};

const getInitialVersion = (): AppVersion => {
  if (typeof window === 'undefined') {
    return 'complete';
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const mapped = mapStoredValue(stored);
    if (mapped) {
      return mapped;
    }
  } catch (err) {
    console.warn('[AppVersion] Failed to read from storage', err);
  }
  return 'complete';
};

export function AppVersionProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState<AppVersion>(getInitialVersion);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, version);
    } catch (err) {
      console.warn('[AppVersion] Failed to persist selection', err);
    }
  }, [version]);

  const value = useMemo<AppVersionContextValue>(() => ({ version, setVersion }), [version]);

  return <AppVersionContext.Provider value={value}>{children}</AppVersionContext.Provider>;
}

export function useAppVersion() {
  const context = useContext(AppVersionContext);
  if (!context) {
    throw new Error('useAppVersion must be used within an AppVersionProvider');
  }
  return context;
}
