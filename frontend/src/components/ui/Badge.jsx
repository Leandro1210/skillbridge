import clsx from 'clsx';

/** M3 assist/filter chip-inspired status pill — mapeia para os papéis
 * de cor M3 (container tonal + on-container), não para uma paleta
 * decorativa à parte. */
const TONES = {
  success: 'text-primary bg-primary-container/40',
  warning: 'text-tertiary bg-tertiary-container/40',
  error: 'text-error bg-error-container/40',
  accent: 'text-tertiary bg-tertiary-container/40',
  neutral: 'text-on-surface-variant bg-surface-container-highest',
};

const DOT = {
  success: 'bg-primary',
  warning: 'bg-tertiary',
  error: 'bg-error',
  accent: 'bg-tertiary',
  neutral: 'bg-outline',
};

export default function Badge({ tone = 'neutral', dot = false, className, children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] px-2.5 py-1 text-label-medium',
        TONES[tone] ?? TONES.neutral,
        className,
      )}
    >
      {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', DOT[tone] ?? DOT.neutral)} />}
      {children}
    </span>
  );
}
