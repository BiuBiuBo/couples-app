'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const success = (message: string) => show(message, 'success');
  const error = (message: string) => show(message, 'error');
  const info = (message: string) => show(message, 'info');
  const warning = (message: string) => show(message, 'warning');

  return (
    <ToastContext.Provider value={{ show, success, error, info, warning }}>
      {children}
      
      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <div className="toast-icon">
              {toast.type === 'success' && '✅'}
              {toast.type === 'error' && '❌'}
              {toast.type === 'warning' && '⚠️'}
              {toast.type === 'info' && 'ℹ️'}
            </div>
            <div className="toast-message">{toast.message}</div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        .toast-container {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10000;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          pointer-events: none;
          width: 90%;
          max-width: 400px;
        }

        .toast {
          pointer-events: auto;
          background: rgba(13, 8, 16, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          padding: 12px 20px;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          gap: 12px;
          animation: toast-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          width: 100%;
        }

        .toast-success { border-left: 4px solid #10b981; }
        .toast-error { border-left: 4px solid #ef4444; }
        .toast-warning { border-left: 4px solid #f59e0b; }
        .toast-info { border-left: 4px solid #3b82f6; }

        .toast-icon { font-size: 18px; }
        .toast-message { font-size: 14px; font-weight: 500; font-family: 'Inter', sans-serif; line-height: 1.4; color: #f3f4f6; }

        @keyframes toast-in-up {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes toast-out {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-10px); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
