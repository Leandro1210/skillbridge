import clsx from 'clsx';

const PADDING = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

/** M3 card types — https://m3.material.io/components/cards
 *  No esquema claro o cartão elevado é branco puro sobre a página
 *  levemente azulada: é o contraste de superfície que o destaca, com a
 *  sombra como reforço. */
const VARIANTS = {
  elevated: 'bg-surface-container-lowest shadow-[var(--shadow-elevation-1)]',
  filled: 'bg-surface-container',
  outlined: 'bg-surface-container-lowest border border-outline-variant',
};

const HOVER = {
  elevated: 'hover:shadow-[var(--shadow-elevation-2)]',
  filled: 'hover:bg-surface-container-high',
  outlined: 'hover:border-outline hover:shadow-[var(--shadow-elevation-1)]',
};

export default function Card({
  variant = 'elevated',
  hoverable = false,
  padding = 'md',
  className,
  children,
  ...rest
}) {
  return (
    <div
      className={clsx(
        'rounded-[var(--radius-lg)] transition-all duration-200',
        VARIANTS[variant],
        PADDING[padding],
        hoverable && ['cursor-pointer hover:-translate-y-0.5', HOVER[variant]],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
