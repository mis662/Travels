import { z } from "zod";
import { DATE_RE } from "@/lib/time";
import { mobileSchema, normalizeMobile, optionalEmailSchema } from "./common";

const name = z.string().trim().min(2, { error: "Enter your full name" }).max(80, { error: "Name is too long" });
const password = z
  .string()
  .min(8, { error: "Password must be at least 8 characters" })
  .max(200, { error: "Password is too long" });
const pin = z.string().regex(/^\d{4,6}$/, { error: "PIN must be 4 to 6 digits" });

export const customerSignupSchema = z
  .object({
    name,
    mobile: mobileSchema,
    email: optionalEmailSchema,
    password,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { error: "Passwords do not match", path: ["confirm"] });

/** Sign in with mobile number or email. */
export const customerLoginSchema = z.object({
  login: z
    .string()
    .trim()
    .min(1, { error: "Enter your mobile number or email" })
    .transform((v) => (v.includes("@") ? v.toLowerCase() : normalizeMobile(v))),
  password: z.string().min(1, { error: "Enter your password" }).max(200),
});

export const adminSignupSchema = z
  .object({
    name,
    email: z.string().trim().toLowerCase().pipe(z.email({ error: "Enter a valid email" })),
    password,
    confirm: z.string(),
    inviteCode: z.string().trim().min(1, { error: "Enter the invite code" }).max(200),
  })
  .refine((d) => d.password === d.confirm, { error: "Passwords do not match", path: ["confirm"] });

export const driverSignupSchema = z
  .object({
    name,
    phone: mobileSchema,
    licenceNumber: z.string().trim().min(5, { error: "Enter your driving licence number" }).max(30),
    licenceExpiry: z.string().regex(DATE_RE, { error: "Select your licence expiry date" }),
    pin,
    confirm: z.string(),
  })
  .refine((d) => d.pin === d.confirm, { error: "PINs do not match", path: ["confirm"] });
