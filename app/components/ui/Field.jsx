import { useId } from "react";
import { cn } from "../../utils/cn.js";

export const controlClasses =
  "w-full rounded-sm border border-field bg-ink px-4 py-3 text-[1.0625rem] text-bone transition-colors duration-150 placeholder:text-faint hover:border-mute focus:border-caramel focus:outline-none focus-visible:outline-2 focus-visible:outline-caramel aria-[invalid=true]:border-clay disabled:opacity-60";

export function FieldLabel({ htmlFor, id, required, children, className }) {
  return (
    <label htmlFor={htmlFor} id={id} className={cn("label-caps mb-2 block text-mute", className)}>
      {children}
      {required && (
        <span className="ml-1 text-caramel" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

export function FieldMessage({ id, error, hint }) {
  if (error) {
    return (
      <p id={id} className="mt-2 text-[0.9375rem] leading-snug text-clay">
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={id} className="mt-2 text-[0.9375rem] leading-snug text-faint">
        {hint}
      </p>
    );
  }
  return null;
}

/**
 * Wrapper genérico: entrega ao filho os atributos de acessibilidade.
 * <Field label="Nome" error={e}>{(a11y) => <input {...a11y} />}</Field>
 */
export function Field({ label, error, hint, required, className, children, id: idProp }) {
  const generated = useId();
  const id = idProp ?? generated;
  const messageId = `${id}-msg`;
  const a11y = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error || hint ? messageId : undefined,
    "aria-required": required || undefined,
  };
  return (
    <div className={className}>
      {label && (
        <FieldLabel htmlFor={id} required={required}>
          {label}
        </FieldLabel>
      )}
      {children(a11y)}
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  );
}

export function TextField({ label, error, hint, required, className, inputClassName, id, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} id={id}>
      {(a11y) => <input className={cn(controlClasses, inputClassName)} required={required} {...a11y} {...props} />}
    </Field>
  );
}

export function TextAreaField({ label, error, hint, required, className, inputClassName, rows = 4, id, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} id={id}>
      {(a11y) => (
        <textarea
          rows={rows}
          className={cn(controlClasses, "min-h-24 resize-y leading-relaxed", inputClassName)}
          required={required}
          {...a11y}
          {...props}
        />
      )}
    </Field>
  );
}

/** options: string[] | { value, label }[] */
export function SelectField({ label, error, hint, required, className, options, placeholder, id, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} id={id}>
      {(a11y) => (
        <select className={cn(controlClasses, "cursor-pointer")} required={required} {...a11y} {...props}>
          {placeholder !== undefined && (
            <option value="" disabled={required}>
              {placeholder}
            </option>
          )}
          {options.map((option) => {
            const value = typeof option === "string" ? option : option.value;
            const text = typeof option === "string" ? option : option.label;
            return (
              <option key={value} value={value}>
                {text}
              </option>
            );
          })}
        </select>
      )}
    </Field>
  );
}

export function CheckboxField({ label, description, error, className, id: idProp, ...props }) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <div className={className}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          className="mt-1 size-[1.125rem] shrink-0 cursor-pointer accent-walnut"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-msg` : undefined}
          {...props}
        />
        <span className="leading-snug">
          <span className="text-bone">{label}</span>
          {description && <span className="mt-0.5 block text-[0.9375rem] text-faint">{description}</span>}
        </span>
      </label>
      <FieldMessage id={`${id}-msg`} error={error} />
    </div>
  );
}
