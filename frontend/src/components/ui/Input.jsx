import clsx from 'clsx';

/** M3 outlined text field — https://m3.material.io/components/text-fields */
const fieldClasses = (error) =>
  clsx(
    'block w-full rounded-[var(--radius-xs)] border bg-transparent px-4 py-2.5 text-body-large text-on-surface',
    'placeholder:text-on-surface-variant/70 transition-all outline-none',
    error
      ? 'border-error focus:border-error focus:ring-2 focus:ring-error/20'
      : 'border-outline focus:border-primary focus:ring-2 focus:ring-primary/20',
  );

function FieldWrapper({ id, label, error, children }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-label-large text-on-surface-variant">
          {label}
        </label>
      )}
      {children}
      {error && <p className="mt-1.5 text-body-small text-error">{error}</p>}
    </div>
  );
}

export function Input({ id, label, error, className, ...rest }) {
  return (
    <FieldWrapper id={id} label={label} error={error}>
      <input id={id} className={clsx(fieldClasses(error), className)} {...rest} />
    </FieldWrapper>
  );
}

export function Textarea({ id, label, error, className, rows = 4, ...rest }) {
  return (
    <FieldWrapper id={id} label={label} error={error}>
      <textarea
        id={id}
        rows={rows}
        className={clsx(fieldClasses(error), 'resize-y', className)}
        {...rest}
      />
    </FieldWrapper>
  );
}

export function Select({ id, label, error, className, children, ...rest }) {
  return (
    <FieldWrapper id={id} label={label} error={error}>
      <select id={id} className={clsx(fieldClasses(error), className)} {...rest}>
        {children}
      </select>
    </FieldWrapper>
  );
}

export default Input;
