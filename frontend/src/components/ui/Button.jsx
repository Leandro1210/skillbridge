import clsx from 'clsx';
import { Link } from 'react-router-dom';

/** M3 button types — https://m3.material.io/components/buttons */
const VARIANTS = {
  filled: 'bg-primary text-on-primary shadow-[var(--shadow-elevation-1)] hover:shadow-[var(--shadow-elevation-2)]',
  tonal: 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80',
  outlined: 'border border-outline text-on-surface bg-transparent hover:bg-on-surface/5',
  text: 'text-primary bg-transparent hover:bg-primary/8',
  danger: 'text-error bg-transparent hover:bg-error/8',
};

const SIZES = {
  sm: 'px-4 py-1.5 text-label-medium',
  md: 'px-6 py-2.5 text-label-large',
};

function classesDoBotao(variant, size, className) {
  return clsx(
    'inline-flex items-center justify-center gap-2 rounded-[var(--radius-full)] font-medium',
    'transition-all duration-200 active:scale-[0.97]',
    'disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 disabled:shadow-none',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export default function Button({
  variant = 'filled',
  size = 'md',
  className,
  children,
  ...rest
}) {
  return (
    <button className={classesDoBotao(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

/**
 * Link de navegação com a aparência de botão. Para ir a outra página use
 * este, não um <Button onClick={navigate}>: link abre em nova aba, aparece
 * como link para leitores de tela e funciona sem JavaScript de clique.
 */
export function LinkButton({ variant = 'filled', size = 'md', className, children, ...rest }) {
  return (
    <Link className={classesDoBotao(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
