import { useEffect } from 'react';
import Icon from './Icon';

/** M3 dialog scrim + surface — https://m3.material.io/components/dialogs */
export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-scrim/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg rounded-[var(--radius-xl)] bg-surface-container-high p-6 shadow-[var(--shadow-elevation-3)] animate-[var(--animate-rise)]"
      >
        {title && (
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-headline-small text-on-surface">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-on-surface/10 hover:text-on-surface"
            >
              <Icon name="close" size="1.125rem" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
