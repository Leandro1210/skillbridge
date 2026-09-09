import clsx from 'clsx';

/** M3 assist/filter chip-inspired status pill — mapeia para os papéis
 * de cor M3 (container tonal + on-container), não para uma paleta
 * decorativa à parte.
 *
 * Antes `success` apontava para o primary (azul) e `warning` para o
 * tertiary, porque o esquema escuro não tinha verde nem âmbar. Com as
 * cores da logo o verde existe de verdade, então "Aprovado", "Ativo" e
 * "Concluído" finalmente aparecem em verde. */
const TONES = {
  success: 'text-on-success-container bg-success-container',
  warning: 'text-on-warning-container bg-warning-container',
  error: 'text-on-error-container bg-error-container',
  accent: 'text-on-tertiary-container bg-tertiary-container',
  neutral: 'text-on-surface-variant bg-surface-container-high',
};

const DOT = {
  success: 'bg-success',
  warning: 'bg-warning',
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
