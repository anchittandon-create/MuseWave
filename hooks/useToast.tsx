import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Toast, ToastContextValue } from '../lib/types';

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutRefs = useRef<Record<number, number>>({});

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    const ref = timeoutRefs.current[id];
    if (ref) {
      window.clearTimeout(ref);
      delete timeoutRefs.current[id];
    }
  }, []);

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    timeoutRefs.current[id] = window.setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  const value = useMemo<ToastContextValue>(() => ({ addToast, removeToast, toasts }), [addToast, removeToast, toasts]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  const toast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    context.addToast(message, type);
  }, [context]);

  return { ...context, toast };
}
