import { useId } from 'react';
import clsx from 'clsx';

/** M3 outlined text field — https://m3.material.io/components/text-fields */
const fieldClasses = (error) =>
  clsx(
    'block w-full rounded-[var(--radius-sm)] border-[1.5px] bg-surface-container-lowest px-4 py-2.5 text-body-large text-on-surface',
    'placeholder:text-on-surface-variant/60 transition-all duration-200 outline-none',
    error
      ? 'border-error focus:border-error focus:ring-4 focus:ring-error/15'
      : 'border-outline-variant hover:border-outline focus:border-primary focus:ring-4 focus:ring-primary/15',
  );

/**
 * Usa o id passado ou gera um. Sem id, o <label htmlFor> não fica ligado ao
 * campo: leitores de tela não anunciam o nome e clicar no rótulo não foca.
 */
function useFieldId(id) {
  const gerado = useId();
  return id ?? gerado;
}

function FieldWrapper({ id, label, error, children }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-label-large text-on-surface">
          {label}
        </label>
      )}
      {children}
      {error && <p className="mt-1.5 text-body-small text-error">{error}</p>}
    </div>
  );
}

export function Input({ id, label, error, className, ...rest }) {
  const fieldId = useFieldId(id);
  return (
    <FieldWrapper id={fieldId} label={label} error={error}>
      <input id={fieldId} className={clsx(fieldClasses(error), className)} {...rest} />
    </FieldWrapper>
  );
}

export function Textarea({ id, label, error, className, rows = 4, ...rest }) {
  const fieldId = useFieldId(id);
  return (
    <FieldWrapper id={fieldId} label={label} error={error}>
      <textarea
        id={fieldId}
        rows={rows}
        className={clsx(fieldClasses(error), 'resize-y', className)}
        {...rest}
      />
    </FieldWrapper>
  );
}

export function Select({ id, label, error, className, children, ...rest }) {
  const fieldId = useFieldId(id);
  return (
    <FieldWrapper id={fieldId} label={label} error={error}>
      <select id={fieldId} className={clsx(fieldClasses(error), className)} {...rest}>
        {children}
      </select>
    </FieldWrapper>
  );
}

export default Input;
