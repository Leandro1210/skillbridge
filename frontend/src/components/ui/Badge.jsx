import clsx from 'clsx';

/**
 * Chip em pílula, como no manual ("Estágio", "Júnior", "Desafio").
 * - accent   azul claro com texto azul   (ex.: Estágio, modalidade)
 * - success  verde claro                  (aprovado, ativo, iniciante)
 * - navy     Azul-noturno com texto branco (ex.: Desafio)
 * - warning / error  sinais de estado
 * - neutral  cinza-azulado
 */
const TONES = {
  success: 'text-on-success-container bg-success-container',
  warning: 'text-on-warning-container bg-warning-container',
  error: 'text-on-error-container bg-error-container',
  accent: 'text-on-primary-container bg-primary-container',
  navy: 'text-white bg-brand-navy',
  neutral: 'text-on-surface-variant bg-surface-container-high',
};

const DOT = {
  success: 'bg-brand-green',
  warning: 'bg-warning',
  error: 'bg-error',
  accent: 'bg-primary',
  navy: 'bg-brand-green',
  neutral: 'bg-outline',
};

export default function Badge({ tone = 'neutral', dot = false, className, children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-medium',
        TONES[tone] ?? TONES.neutral,
        className,
      )}
    >
      {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', DOT[tone] ?? DOT.neutral)} />}
      {children}
    </span>
  );
}
