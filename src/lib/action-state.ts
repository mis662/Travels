import type { z } from "zod";

export type ActionState = { ok?: boolean; message?: string; error?: string };
export type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function formObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

/** First validation message, prefixed with the field name, for admin forms. */
export function firstError(error: z.ZodError): string {
  const issue = error.issues[0];
  const field = issue.path.join(".");
  return field ? `${humanize(field)}: ${issue.message}` : issue.message;
}

function humanize(s: string) {
  return s.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}
