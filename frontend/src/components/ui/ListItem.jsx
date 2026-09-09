import clsx from 'clsx';

/**
 * Linha de lista densa (M3 "Lists") — para conteúdo sequencial que se
 * escaneia em lote (ex: submissões), em vez de cada item virar um Card
 * com borda e sombra próprias.
 */
export function ListItem({ leading, title, subtitle, trailing, children, className, ...rest }) {
  return (
    <div
      className={clsx(
        'flex items-start gap-4 border-b border-outline-variant py-5 last:border-b-0',
        className,
      )}
      {...rest}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        {title && <div className="text-title-medium text-on-surface">{title}</div>}
        {subtitle && <div className="mt-0.5 text-body-small text-on-surface-variant">{subtitle}</div>}
        {children}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}

/** Contêiner com bordas arredondadas para agrupar ListItems. */
export function List({ children, className }) {
  return (
    <div className={clsx('rounded-[var(--radius-lg)] border border-outline-variant bg-surface-container-lowest px-5', className)}>
      {children}
    </div>
  );
}

export default ListItem;
