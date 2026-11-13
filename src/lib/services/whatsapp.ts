import { digitsOnly, formatDateTime, formatINR } from "@/lib/format";
import { tripTypeLabel } from "@/lib/booking/status";

export function waLink(phone: string, message?: string): string {
  const base = `https://wa.me/${digitsOnly(phone)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

interface WaBooking {
  code: string;
  tripType: string;
  pickupAt: Date;
  pickupLocation: string;
  dropLocation: string;
  pickupAddress: string;
  customerName: string;
  customerMobile: string;
  passengers: number;
  estimatedFare: number;
  category: { name: string };
}

export function bookingWhatsAppMessage(b: WaBooking): string {
  return [
    `Hello, I have made a booking request.`,
    `Booking ID: ${b.code}`,
    `Trip: ${tripTypeLabel(b.tripType)}`,
    `From: ${b.pickupLocation}`,
    `To: ${b.dropLocation}`,
    `Pickup: ${formatDateTime(b.pickupAt)}`,
    `Pickup address: ${b.pickupAddress}`,
    `Car: ${b.category.name}`,
    `Passengers: ${b.passengers}`,
    `Estimated fare: ${formatINR(b.estimatedFare)}`,
    `Name: ${b.customerName} (${b.customerMobile})`,
    `Please confirm. Thank you!`,
  ].join("\n");
}
