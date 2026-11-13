"use client";

import { createContext, useContext, useRef, useState, useTransition, type ReactNode } from "react";
import type { ActionState, FormAction } from "@/lib/action-state";

const PendingContext = createContext(false);

/**
 * Admin form that calls a server action without React's automatic form reset
 * (so typed values survive a validation error) and shows the result message.
 */
export function ActionForm({
  action,
  children,
  className = "space-y-4",
  resetOnSuccess = false,
  confirm,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
}) {
  const [state, setState] = useState<ActionState>({});
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  return (
    <PendingContext.Provider value={pending}>
      <form
        ref={ref}
        className={className}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          if (confirm && !window.confirm(confirm)) return;
          const fd = new FormData(e.currentTarget);
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          if (submitter?.name) fd.set(submitter.name, submitter.value);
          start(async () => {
            const res = (await action(state, fd)) ?? {};
            setState(res);
            if (res.ok && resetOnSuccess) ref.current?.reset();
          });
        }}
      >
        {children}
        {state.error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}
        {state.ok && state.message && (
          <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{state.message}</p>
        )}
      </form>
    </PendingContext.Provider>
  );
}

export function Submit({ children, className = "btn-primary", name, value }: { children: ReactNode; className?: string; name?: string; value?: string }) {
  const pending = useContext(PendingContext);
  return (
    <button type="submit" className={className} disabled={pending} name={name} value={value} aria-busy={pending}>
      {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
      {children}
    </button>
  );
}
