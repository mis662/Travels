import { z } from "zod";
import { DATE_RE, TIME_RE } from "@/lib/time";

/** Strip spaces, dashes, +91 / 91 / 0 prefixes → 10 digits. */
export function normalizeMobile(input: string): string {
  let d = input.replace(/[\s\-()]/g, "");
  if (d.startsWith("+91")) d = d.slice(3);
  else if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
}

export const mobileSchema = z
  .string({ error: "Mobile number is required" })
  .transform(normalizeMobile)
  .pipe(z.string().regex(/^[6-9]\d{9}$/, { error: "Enter a valid 10-digit Indian mobile number" }));

export const optionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.email({ error: "Enter a valid email address" }).optional());

export const dateSchema = z.string({ error: "Date is required" }).regex(DATE_RE, { error: "Select a valid date" });
export const timeSchema = z.string({ error: "Time is required" }).regex(TIME_RE, { error: "Select a valid time" });
export const slugSchema = z
  .string({ error: "Please make a selection" })
  .regex(/^[a-z0-9-]{1,80}$/, { error: "Please make a selection" });

/** Convert a ZodError into { field: firstMessage } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
