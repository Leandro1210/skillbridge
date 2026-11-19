/**
 * Título de página: Montserrat ExtraBold, com a assinatura das faixas da
 * marca (duas pílulas diagonais, azul e verde) acima do título.
 */
export default function PageHeader({ title, description, actions, eyebrow, className }) {
  return (
    <div className={`mb-8 flex flex-col gap-4 animate-[var(--animate-rise)] sm:flex-row sm:items-end sm:justify-between ${className ?? ''}`}>
      <div>
        <div className="mb-3 flex items-center gap-3">
          <span aria-hidden="true" className="flex -rotate-[27deg] flex-col gap-1">
            <span className="block h-1.5 w-7 rounded-full bg-brand-blue" />
            <span className="ml-2 block h-1.5 w-5 rounded-full bg-brand-green" />
          </span>
          {eyebrow && <span className="text-label-medium uppercase tracking-[0.14em] text-primary">{eyebrow}</span>}
        </div>
        <h1 className="text-headline-large text-on-surface">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-body-large text-on-surface-variant">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
