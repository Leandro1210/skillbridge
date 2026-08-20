/**
 * Título de página no tratamento "top app bar grande" do M3 — troca
 * os <h1> soltos repetidos em cada tela por um único padrão consistente.
 */
export default function PageHeader({ title, description, actions, className }) {
  return (
    <div className={`mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className ?? ''}`}>
      <div>
        <h1 className="text-headline-large text-on-surface">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-body-large text-on-surface-variant">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
