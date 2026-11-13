/**
 * Email notifications via Nodemailer. When SMTP_HOST is not set, emails are
 * printed to the server console instead — booking never fails because of email.
 */
import nodemailer, { type Transporter } from "nodemailer";
import type { Booking, CarCategory, Driver, Vehicle } from "@prisma/client";
import { formatDateTime, formatINR } from "@/lib/format";
import { statusLabel, tripTypeLabel } from "@/lib/booking/status";
import { siteConfig } from "@/config/site";
import { getSettings } from "./settings";

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const host = process.env.SMTP_HOST;
  transporter = host
    ? nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      })
    : null;
  return transporter;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.log(
      `\n──── EMAIL (SMTP not configured, logged only) ────\nTo: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n──────────────────────────────────────────────\n`,
    );
    return;
  }
  try {
    await t.sendMail({ from: process.env.MAIL_FROM || siteConfig.email, ...msg });
  } catch (err) {
    console.error(`[email] failed to send "${msg.subject}" to ${msg.to}:`, err);
  }
}

type FullBooking = Booking & { category: CarCategory; driver: Driver | null; vehicle: Vehicle | null };

function bookingLines(b: FullBooking): [string, string][] {
  const rows: [string, string][] = [
    ["Booking ID", b.code],
    ["Status", statusLabel(b.status)],
    ["Trip", tripTypeLabel(b.tripType)],
    ["From", b.pickupLocation],
    ["To", b.dropLocation],
    ["Pickup", formatDateTime(b.pickupAt)],
    ["Pickup address", b.pickupAddress],
  ];
  if (b.dropAddress) rows.push(["Drop address", b.dropAddress]);
  if (b.returnAt) rows.push(["Return", formatDateTime(b.returnAt).replace(/,[^,]*$/, "")]);
  rows.push(
    ["Car", `${b.category.name} (${b.category.exampleModels})`],
    ["Passengers", String(b.passengers)],
    ["Estimated fare", formatINR(b.finalFare ?? b.estimatedFare)],
    ["Customer", `${b.customerName}, ${b.customerMobile}${b.customerEmail ? ", " + b.customerEmail : ""}`],
  );
  if (b.driver) rows.push(["Driver", `${b.driver.name} (${b.driver.phone})`]);
  if (b.vehicle) rows.push(["Vehicle", `${b.vehicle.model} – ${b.vehicle.registrationNumber}`]);
  if (b.specialRequests) rows.push(["Special requests", b.specialRequests]);
  if (b.cancelReason) rows.push(["Cancellation reason", b.cancelReason]);
  return rows;
}

function render(title: string, intro: string, b: FullBooking, footer: string): Omit<EmailMessage, "to" | "subject"> {
  const rows = bookingLines(b);
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1e293b">
<h2 style="color:#1e3a8a">${esc(title)}</h2><p>${esc(intro)}</p>
<table style="border-collapse:collapse;width:100%">${rows
    .map(([k, v]) => `<tr><td style="padding:6px;border-bottom:1px solid #e2e8f0;color:#64748b">${esc(k)}</td><td style="padding:6px;border-bottom:1px solid #e2e8f0"><b>${esc(v)}</b></td></tr>`)
    .join("")}</table><p style="margin-top:16px">${esc(footer)}</p></div>`;
  const text = `${title}\n\n${intro}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${footer}`;
  return { html, text };
}

async function adminEmail() {
  const s = await getSettings();
  return process.env.ADMIN_NOTIFY_EMAIL || s.email;
}

export async function notifyBookingCreated(b: FullBooking) {
  const s = await getSettings();
  const jobs: Promise<void>[] = [
    sendEmail({
      to: await adminEmail(),
      subject: `New booking ${b.code} – ${tripTypeLabel(b.tripType)} – ${formatDateTime(b.pickupAt)}`,
      ...render("New booking request", "A new booking request has been received. Please confirm with the customer.", b, `${siteConfig.url}/admin`),
    }),
  ];
  if (b.customerEmail) {
    jobs.push(
      sendEmail({
        to: b.customerEmail,
        subject: `Booking request received – ${b.code}`,
        ...render(
          `Thank you, ${b.customerName}!`,
          `We have received your booking request. Our team will call or WhatsApp you shortly to confirm. ${siteConfig.paymentNote}`,
          b,
          `Questions? Call ${s.phonePrimary} or reply to this email. Track your booking: ${siteConfig.url}/track`,
        ),
      }),
    );
  }
  await Promise.all(jobs);
}

export async function notifyStatusChanged(b: FullBooking, from: string | null) {
  const s = await getSettings();
  const jobs: Promise<void>[] = [
    sendEmail({
      to: await adminEmail(),
      subject: `Booking ${b.code}: ${statusLabel(from ?? "")} → ${statusLabel(b.status)}`,
      ...render(`Booking ${statusLabel(b.status)}`, `Status changed from ${statusLabel(from ?? "")} to ${statusLabel(b.status)}.`, b, `${siteConfig.url}/admin`),
    }),
  ];
  if (b.customerEmail) {
    const intro: Record<string, string> = {
      CONFIRMED: "Your booking is confirmed. Driver details will be shared before pickup.",
      DRIVER_ASSIGNED: "A driver has been assigned to your trip.",
      ONGOING: "Your trip has started. Have a safe journey!",
      COMPLETED: "Your trip is complete. Thank you for travelling with us!",
      CANCELLED: "Your booking has been cancelled.",
      PENDING: "Your booking is pending confirmation.",
    };
    jobs.push(
      sendEmail({
        to: b.customerEmail,
        subject: `Booking ${b.code} – ${statusLabel(b.status)}`,
        ...render(`Booking ${statusLabel(b.status)}`, intro[b.status] ?? "", b, `Need help? Call ${s.phonePrimary}. Track: ${siteConfig.url}/track`),
      }),
    );
  }
  await Promise.all(jobs);
}

/** Fire-and-forget wrapper: never throws, never blocks the request for long. */
export function notifySafely(fn: () => Promise<void>) {
  fn().catch((err) => console.error("[notify] error:", err));
}
