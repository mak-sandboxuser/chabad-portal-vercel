import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { dismissToastKey, subscribeToasts } from '../../utils/toast';

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return subscribeToasts((toast) => {
      setToasts((prev) => {
        const withoutDup = prev.filter(
          (item) => !(item.message === toast.message && item.type === toast.type),
        );
        return [...withoutDup, toast];
      });
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
        if (toast.key) dismissToastKey(toast.key);
      }, toast.duration || 4000);
    });
  }, []);

  const dismiss = (id) => {
    setToasts((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.key) dismissToastKey(target.key);
      return prev.filter((item) => item.id !== id);
    });
  };

  if (!toasts.length) return null;

  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <div className="toast-icon">
            {toast.type === 'error' ? <XCircle size={18} /> : <CheckCircle size={18} />}
          </div>
          <p className="toast-message">{toast.message}</p>
          <button type="button" className="toast-close" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
