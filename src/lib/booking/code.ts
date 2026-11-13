import { randomInt } from "node:crypto";
import { istParts } from "@/lib/time";

// No 0/O/1/I to avoid confusion when read over the phone.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export const BOOKING_CODE_RE = /^[A-Z]{3}-\d{8}-[A-Z0-9]{4}$/;

/** MUM-YYYYMMDD-XXXX, date = booking creation date in IST. */
export function generateBookingCode(prefix = "MUM", now = new Date()): string {
  const p = istParts(now);
  const date = p.date.replaceAll("-", "");
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `${prefix}-${date}-${suffix}`;
}

export function normalizeBookingCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}
