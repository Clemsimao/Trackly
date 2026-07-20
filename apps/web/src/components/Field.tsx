import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  children?: ReactNode;
}

/** Champ accessible : label lié, erreur annoncée (G3). */
export function Field({ label, error, children, ...input }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2.5 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
        {...input}
      />
      {children}
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-sm text-dropped">
          {error}
        </p>
      ) : null}
    </div>
  );
}
