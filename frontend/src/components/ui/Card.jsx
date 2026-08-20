import clsx from 'clsx';

const PADDING = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

/** M3 card types — https://m3.material.io/components/cards */
const VARIANTS = {
  elevated: 'bg-surface-container-low shadow-[var(--shadow-elevation-1)]',
  filled: 'bg-surface-container-highest',
  outlined: 'bg-surface border border-outline-variant',
};

const HOVER = {
  elevated: 'hover:shadow-[var(--shadow-elevation-2)]',
  filled: 'hover:bg-surface-container-highest/80',
  outlined: 'hover:bg-surface-container-lowest',
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
