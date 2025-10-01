import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Toast, ToastContextValue } from '../lib/types';

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// Provider component
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, toasts, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

// Custom hook
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  // Create a convenience function for showing toasts
  const toast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    context.addToast(message, type);
  }, [context]);

  // Return the full context and the convenience function
  return { ...context, toast };
};
