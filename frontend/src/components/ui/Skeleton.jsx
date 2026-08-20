import clsx from 'clsx';

/**
 * Bloco de carregamento com o mesmo shimmer da barra de XP — reaproveita
 * o único keyframe decorativo que sobrou no design system.
 */
export default function Skeleton({ className }) {
  return (
    <div
      className={clsx('rounded-[var(--radius-xs)] bg-surface-container-low', className)}
      style={{
        backgroundImage:
          'linear-gradient(90deg, var(--color-surface-container-low) 25%, var(--color-surface-container-high) 37%, var(--color-surface-container-low) 63%)',
        backgroundSize: '400% 100%',
        animation: 'shimmer 1.6s ease-in-out infinite',
      }}
    />
  );
}
