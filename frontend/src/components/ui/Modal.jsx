import { useEffect, useRef } from 'react';
import Icon from './Icon';

/** M3 dialog scrim + surface — https://m3.material.io/components/dialogs */
export default function Modal({ open, onClose, title, children }) {
  const dialogRef = useRef(null);
  // Ref para o effect abaixo não reabrir o modal a cada render só porque
  // o pai passou um onClose novo (arrow function inline).
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;

    // showModal() deixa o navegador cuidar do foco preso no modal e do fundo (::backdrop)
    dialog.showModal();
    document.body.style.overflow = 'hidden';

    // Esc: o navegador fecharia o <dialog> sozinho; deixamos o estado do React decidir
    const handleCancel = (e) => {
      e.preventDefault();
      onCloseRef.current?.();
    };
    // Clique fora do conteúdo cai no próprio <dialog> (área do ::backdrop).
    // Equivalente de teclado: Esc e o botão "Fechar".
    const handleBackdropClick = (e) => {
      if (e.target === dialog) onCloseRef.current?.();
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('click', handleBackdropClick);
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('click', handleBackdropClick);
      document.body.style.overflow = '';
      dialog.close();
    };
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-[var(--radius-xl)] bg-surface-container-lowest p-0 text-inherit shadow-[var(--shadow-elevation-3)] animate-[var(--animate-rise)] backdrop:bg-scrim/40"
    >
      <div className="p-6">
        {title && (
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-headline-small text-on-surface">{title}</h2>
            <button
              type="button"
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
    </dialog>
  );
}
