import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import './Toast.css';

const ToastContext = createContext(null);

// Petits messages de confirmation / d'erreur en bas de l'écran
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const afficher = useCallback((message, type) => {
    const id = Date.now() + Math.random();
    setToasts((liste) => [...liste, { id, message, type }]);
    setTimeout(() => setToasts((liste) => liste.filter((t) => t.id !== id)), 4500);
  }, []);

  const valeur = useMemo(() => ({
    succes: (message) => afficher(message, 'succes'),
    erreur: (message) => afficher(message, 'erreur'),
  }), [afficher]);

  return (
    <ToastContext.Provider value={valeur}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
