/** Cookie listing booking codes created from this browser (lets the confirmation page show full details). */
export const RECENT_BOOKINGS_COOKIE = "recent_bookings";

export function parseRecentBookings(value: string | undefined): string[] {
  return (value ?? "").split(",").filter(Boolean);
}
