import type { ReactNode } from "react";

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/** Label + control + accessible error/hint. The control should set id, aria-invalid and aria-describedby={`${id}-msg`}. */
export function Field({ id, label, error, hint, required, children, className }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function aria(id: string, error?: string) {
  return { id, name: id, "aria-invalid": error ? true : undefined, "aria-describedby": `${id}-msg` } as const;
}

export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (error)
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  if (success)
    return (
      <div role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        {success}
      </div>
    );
  return null;
}
