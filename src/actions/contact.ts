"use server";

import { prisma } from "@/lib/db";
import { contactSchema } from "@/lib/validation/contact";
import { fieldErrors } from "@/lib/validation/common";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getSettings } from "@/lib/services/settings";
import { notifySafely, sendEmail } from "@/lib/services/notifications";

export type ContactState = {
  ok?: boolean;
  errors?: Record<string, string>;
  values?: Record<string, string>;
};

export async function submitContactAction(_prev: ContactState, fd: FormData): Promise<ContactState> {
  const values = Object.fromEntries(["name", "mobile", "email", "subject", "message"].map((k) => [k, String(fd.get(k) ?? "")]));
  if (!rateLimit(`contact:${await clientIp()}`, 5, 10 * 60_000)) {
    return { values, errors: { _form: "Too many messages. Please try again later or call us." } };
  }
  const parsed = contactSchema.safeParse({ ...values, website: String(fd.get("website") ?? "") });
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    if (errors.website) return { ok: true }; // bot: pretend success
    return { values, errors };
  }
  const { name, mobile, email, subject, message } = parsed.data;
  const enquiry = await prisma.contactEnquiry.create({ data: { name, mobile, email: email ?? null, subject, message } });

  const s = await getSettings();
  notifySafely(() =>
    sendEmail({
      to: process.env.ADMIN_NOTIFY_EMAIL || s.email,
      subject: `New enquiry from ${enquiry.name}${enquiry.subject ? `: ${enquiry.subject}` : ""}`,
      text: `Name: ${enquiry.name}\nMobile: ${enquiry.mobile}\nEmail: ${enquiry.email ?? "-"}\n\n${enquiry.message}`,
      html: `<p><b>Name:</b> ${esc(enquiry.name)}<br><b>Mobile:</b> ${esc(enquiry.mobile)}<br><b>Email:</b> ${esc(enquiry.email ?? "-")}</p><p>${esc(enquiry.message).replace(/\n/g, "<br>")}</p>`,
    }),
  );
  return { ok: true };
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
