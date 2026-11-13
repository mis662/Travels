export const BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "DRIVER_ASSIGNED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  DRIVER_ASSIGNED: "Driver Assigned",
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const STATUS_COLORS: Record<BookingStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  DRIVER_ASSIGNED: "bg-indigo-100 text-indigo-800",
  ONGOING: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

/** Which status changes an admin may make from each status. */
export const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["DRIVER_ASSIGNED", "CANCELLED", "PENDING"],
  DRIVER_ASSIGNED: ["ONGOING", "CONFIRMED", "CANCELLED"],
  ONGOING: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function isBookingStatus(s: string): s is BookingStatus {
  return (BOOKING_STATUSES as readonly string[]).includes(s);
}

export function canTransition(from: string, to: string): boolean {
  if (!isBookingStatus(from) || !isBookingStatus(to)) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Statuses from which the customer may cancel (subject to the time cut-off). */
export const CUSTOMER_CANCELLABLE: BookingStatus[] = ["PENDING", "CONFIRMED", "DRIVER_ASSIGNED"];

export function canCustomerCancel(
  status: string,
  pickupAt: Date,
  cutoffHours: number,
  now = new Date(),
): boolean {
  if (!isBookingStatus(status) || !CUSTOMER_CANCELLABLE.includes(status)) return false;
  return pickupAt.getTime() - now.getTime() > cutoffHours * 60 * 60 * 1000;
}

export const TRIP_TYPES = [
  "AIRPORT",
  "LOCAL",
  "OUTSTATION_ONE_WAY",
  "OUTSTATION_ROUND_TRIP",
  "CORPORATE",
] as const;
export type TripType = (typeof TRIP_TYPES)[number];

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  AIRPORT: "Airport Transfer",
  LOCAL: "Local Rental",
  OUTSTATION_ONE_WAY: "Outstation – One Way",
  OUTSTATION_ROUND_TRIP: "Outstation – Round Trip",
  CORPORATE: "Corporate Duty",
};

export function tripTypeLabel(t: string): string {
  return TRIP_TYPE_LABELS[t as TripType] ?? t;
}

export function statusLabel(s: string): string {
  return STATUS_LABELS[s as BookingStatus] ?? s;
}
