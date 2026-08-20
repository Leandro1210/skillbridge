import clsx from 'clsx';

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

export default function Button({
  variant = 'filled',
  size = 'md',
  className,
  children,
  ...rest
}) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-full)] font-medium',
        'transition-all duration-200 active:scale-[0.97]',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 disabled:shadow-none',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
