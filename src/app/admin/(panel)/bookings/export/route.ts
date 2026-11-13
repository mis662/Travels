import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bookingScope, getCurrentAdmin } from "@/lib/auth/session";
import { bookingWhere, csvEscape, readFilters } from "@/lib/services/admin-bookings";
import { istParts } from "@/lib/time";
import { statusLabel, tripTypeLabel } from "@/lib/booking/status";

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filters = readFilters(Object.fromEntries(req.nextUrl.searchParams));
  const bookings = await prisma.booking.findMany({
    where: { AND: [bookingWhere(filters), bookingScope(admin)] },
    include: { category: true, driver: true, vehicle: true },
    orderBy: { pickupAt: "desc" },
    take: 10_000,
  });

  const ist = (d: Date | null) => (d ? `${istParts(d).date} ${istParts(d).time}` : "");
  const header = [
    "Booking ID", "Status", "Trip Type", "Pickup (IST)", "Return (IST)", "From", "To", "Pickup Address", "Drop Address",
    "Customer", "Mobile", "Email", "Passengers", "Car", "Driver", "Vehicle", "Estimated Fare", "GST", "Final Fare",
    "Payment Status", "Cancel Reason", "Special Requests", "Created (IST)",
  ];
  const rows = bookings.map((b) => [
    b.code, statusLabel(b.status), tripTypeLabel(b.tripType), ist(b.pickupAt), ist(b.returnAt), b.pickupLocation, b.dropLocation,
    b.pickupAddress, b.dropAddress, b.customerName, b.customerMobile, b.customerEmail, b.passengers, b.category.name,
    b.driver?.name, b.vehicle?.registrationNumber, b.estimatedFare, b.gstAmount, b.finalFare, b.paymentStatus,
    b.cancelReason, b.specialRequests, ist(b.createdAt),
  ]);
  const csv = "﻿" + [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings-${istParts(new Date()).date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
