import Link from "next/link";
import type { ResolvedTrip } from "@/lib/services/pricing";
import type { TimingResult } from "@/lib/booking/rules";
import { tripTypeLabel } from "@/lib/booking/status";
import { formatDate, formatDateTime } from "@/lib/format";
import { tripSearchToQuery } from "@/lib/validation/booking";

export function TripSummary({ trip, timing, editable = true }: { trip: ResolvedTrip; timing: TimingResult; editable?: boolean }) {
  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-slate-500">Trip</dt><dd className="font-semibold">{tripTypeLabel(trip.tripType)}</dd></div>
        <div><dt className="text-slate-500">Route</dt><dd className="font-semibold">{trip.summary}</dd></div>
        <div><dt className="text-slate-500">Pickup</dt><dd className="font-semibold">{timing.pickupAt ? formatDateTime(timing.pickupAt) : "—"}</dd></div>
        {trip.tripType === "OUTSTATION_ROUND_TRIP" && timing.returnAt && (
          <div><dt className="text-slate-500">Return</dt><dd className="font-semibold">{formatDate(timing.returnAt)} ({timing.days} day{timing.days > 1 ? "s" : ""})</dd></div>
        )}
        {trip.route && (
          <div><dt className="text-slate-500">Distance</dt><dd className="font-semibold">{trip.route.distanceKm} km one way · {trip.route.durationText}</dd></div>
        )}
      </dl>
      {editable && (
        <Link href={`/?${tripSearchToQuery(trip.search)}#book`} className="btn-outline shrink-0">
          Modify
        </Link>
      )}
    </div>
  );
}
