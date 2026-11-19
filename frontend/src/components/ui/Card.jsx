import clsx from 'clsx';

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

/** M3 card types — https://m3.material.io/components/cards
 *  No esquema claro o cartão elevado é branco puro sobre a página
 *  levemente azulada: é o contraste de superfície que o destaca, com a
 *  sombra como reforço. */
const VARIANTS = {
  elevated: 'bg-surface-container-lowest border border-outline-variant/70 shadow-[var(--shadow-elevation-1)]',
  filled: 'bg-surface-container',
  outlined: 'bg-surface-container-lowest border border-outline-variant',
};

// Ao passar o mouse o cartão sobe um pouco e ganha sombra: sinal de que é clicável
const HOVER = {
  elevated: 'hover:border-primary/25 hover:shadow-[var(--shadow-elevation-2)]',
  filled: 'hover:bg-surface-container-high',
  outlined: 'hover:border-primary/30 hover:shadow-[var(--shadow-elevation-1)]',
};

export default function Card({
  variant = 'elevated',
  as = 'div', // ex.: "article" para um item de feed
  hoverable = false,
  padding = 'md',
  className,
  children,
  ...rest
}) {
  const Tag = as;
  return (
    <Tag
      className={clsx(
        'rounded-[var(--radius-lg)] transition-all duration-300 ease-[var(--ease-brand)]',
        VARIANTS[variant],
        PADDING[padding],
        hoverable && ['hover:-translate-y-1', HOVER[variant]],
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
