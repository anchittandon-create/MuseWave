import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAppVersion, type AppVersion } from './AppVersionContext';

export type GenerationCategory = 'song' | 'audio' | 'video';

type VersionQuotaState = {
  counts: Record<GenerationCategory, number>;
  lastReset: string;
};

type PersistedQuotaState = Record<AppVersion, VersionQuotaState>;

type GenerationQuotaContextValue = {
  limits: Record<GenerationCategory, number | null>;
  counts: Record<GenerationCategory, number>;
  remaining: Record<GenerationCategory, number | null>;
  canStartGeneration: (types: GenerationCategory[]) => boolean;
  recordGeneration: (types: GenerationCategory[]) => void;
  resetQuota: () => void;
};

const STORAGE_KEY = 'musewave_generation_quota_v1';
const DEFAULT_COUNTS: Record<GenerationCategory, number> = {
  song: 0,
  audio: 0,
  video: 0,
};

const LIMITS: Record<AppVersion, Record<GenerationCategory, number | null>> = {
  complete: {
    song: 4,
    audio: 8,
    video: 3,
  },
  oss: {
    song: null,
    audio: null,
    video: null,
  },
};

const getTodayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
};

const createDefaultState = (): PersistedQuotaState => ({
  complete: { counts: { ...DEFAULT_COUNTS }, lastReset: getTodayKey() },
  oss: { counts: { ...DEFAULT_COUNTS }, lastReset: getTodayKey() },
});

const readInitialState = (): PersistedQuotaState => {
  if (typeof window === 'undefined') {
    return createDefaultState();
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return createDefaultState();
    const parsed = JSON.parse(stored) as PersistedQuotaState;
    if (parsed.complete && parsed.oss) {
      return parsed;
    }
  } catch (err) {
    console.warn('[GenerationQuota] Failed to parse storage', err);
  }
  return createDefaultState();
};

const GenerationQuotaContext = createContext<GenerationQuotaContextValue | undefined>(undefined);

export function GenerationQuotaProvider({ children }: { children: React.ReactNode }) {
  const { version } = useAppVersion();
  const [state, setState] = useState<PersistedQuotaState>(readInitialState);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('[GenerationQuota] Failed to persist state', err);
    }
  }, [state]);

  useEffect(() => {
    const today = getTodayKey();
    setState(prev => {
      const next = { ...prev };
      const current = next[version] ?? { counts: { ...DEFAULT_COUNTS }, lastReset: today };
      if (current.lastReset === today) {
        return prev;
      }
      next[version] = { counts: { ...DEFAULT_COUNTS }, lastReset: today };
      return next;
    });
  }, [version]);

  const limits = LIMITS[version];
  const activeState = state[version] ?? { counts: { ...DEFAULT_COUNTS }, lastReset: getTodayKey() };

  const remaining = useMemo<Record<GenerationCategory, number | null>>(() => {
    return (Object.keys(DEFAULT_COUNTS) as GenerationCategory[]).reduce((acc, key) => {
      const limit = limits[key];
      if (limit === null) {
        acc[key] = null;
      } else {
        acc[key] = Math.max(limit - (activeState.counts[key] ?? 0), 0);
      }
      return acc;
    }, {} as Record<GenerationCategory, number | null>);
  }, [activeState.counts, limits]);

  const canStartGeneration = useCallback(
    (types: GenerationCategory[]) => {
      return types.every(type => {
        const limit = limits[type];
        if (limit === null) return true;
        return (activeState.counts[type] ?? 0) < limit;
      });
    },
    [activeState.counts, limits]
  );

  const recordGeneration = useCallback(
    (types: GenerationCategory[]) => {
      if (!types.length) return;
      setState(prev => {
        const next = { ...prev };
        const current = next[version] ?? { counts: { ...DEFAULT_COUNTS }, lastReset: getTodayKey() };
        const updatedCounts = { ...current.counts };
        types.forEach(type => {
          if (limits[type] === null) return;
          updatedCounts[type] = (updatedCounts[type] ?? 0) + 1;
        });
        next[version] = { ...current, counts: updatedCounts };
        return next;
      });
    },
    [limits, version]
  );

  const resetQuota = useCallback(() => {
    const today = getTodayKey();
    setState(prev => ({
      ...prev,
      [version]: { counts: { ...DEFAULT_COUNTS }, lastReset: today },
    }));
  }, [version]);

  const value = useMemo<GenerationQuotaContextValue>(
    () => ({
      limits,
      counts: activeState.counts,
      remaining,
      canStartGeneration,
      recordGeneration,
      resetQuota,
    }),
    [activeState.counts, canStartGeneration, limits, recordGeneration, remaining, resetQuota]
  );

  return <GenerationQuotaContext.Provider value={value}>{children}</GenerationQuotaContext.Provider>;
}

export function useGenerationQuota() {
  const context = useContext(GenerationQuotaContext);
  if (!context) {
    throw new Error('useGenerationQuota must be used within a GenerationQuotaProvider');
  }
  return context;
}
