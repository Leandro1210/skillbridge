import clsx from 'clsx';

/**
 * Bloco de carregamento: um brilho azulado que atravessa a forma do
 * conteúdo que vai aparecer (névoa → azul claro → névoa).
 */
export default function Skeleton({ className }) {
  return (
    <div
      aria-hidden="true"
      className={clsx('rounded-[var(--radius-sm)] bg-surface-container', className)}
      style={{
        backgroundImage:
          'linear-gradient(100deg, var(--color-surface-container) 30%, var(--color-primary-container) 46%, var(--color-surface-container-lowest) 50%, var(--color-primary-container) 54%, var(--color-surface-container) 70%)',
        backgroundSize: '300% 100%',
        animation: 'shimmer 1.8s ease-in-out infinite',
      }}
    />
  );
}
