import { z } from "zod";
import { mobileSchema, optionalEmailSchema } from "./common";

export const contactSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter your name" }).max(80),
  mobile: mobileSchema,
  email: optionalEmailSchema,
  subject: z.string().trim().max(120).optional().default(""),
  message: z.string().trim().min(10, { error: "Please write at least 10 characters" }).max(2000, { error: "Message is too long" }),
  // Honeypot: real users never fill this hidden field
  website: z.string().max(0).optional(),
});
