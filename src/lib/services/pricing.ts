/**
 * Loads pricing data from the database and feeds it to the pure fare engine.
 */
import type { Airport, AirportZone, CarCategory, LocalPackage, Route, Setting } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calculateFare, FareError, type FareBreakdown, type TripFareInput } from "@/lib/fare/engine";
import { istParts, istToDate } from "@/lib/time";
import type { TripSearch } from "@/lib/validation/booking";
import type { TripType } from "@/lib/booking/status";
import { toPricingSettings } from "./settings";

export async function getBookingOptions() {
  const [airports, zones, packages, routes] = await Promise.all([
    prisma.airport.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.airportZone.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.localPackage.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.route.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { toCity: "asc" }] }),
  ]);
  return {
    airports: airports.map((a) => ({ slug: a.slug, name: a.name, shortName: a.shortName })),
    zones: zones.map((z) => ({ slug: z.slug, name: z.name, areas: z.areas })),
    packages: packages.map((p) => ({ code: p.code, name: p.name })),
    routes: routes.map((r) => ({ slug: r.slug, toCity: r.toCity, distanceKm: r.distanceKm })),
  };
}
export type BookingOptions = Awaited<ReturnType<typeof getBookingOptions>>;

export interface ResolvedTrip {
  search: TripSearch;
  tripType: TripType;
  airportDirection: "PICKUP" | "DROP" | null;
  airport?: Airport;
  zone?: AirportZone;
  pkg?: LocalPackage;
  route?: Route;
  pickupLocation: string;
  dropLocation: string;
  summary: string;
}

/** Look up the airport/zone/package/route referenced by a trip search. Returns null if any is missing or inactive. */
export async function resolveTrip(search: TripSearch): Promise<ResolvedTrip | null> {
  switch (search.type) {
    case "airport": {
      const [airport, zone] = await Promise.all([
        prisma.airport.findFirst({ where: { slug: search.airport, active: true } }),
        prisma.airportZone.findFirst({ where: { slug: search.zone, active: true } }),
      ]);
      if (!airport || !zone) return null;
      const pickup = search.dir === "pickup";
      return {
        search,
        tripType: "AIRPORT",
        airportDirection: pickup ? "PICKUP" : "DROP",
        airport,
        zone,
        pickupLocation: pickup ? airport.name : zone.name,
        dropLocation: pickup ? zone.name : airport.name,
        summary: pickup ? `${airport.shortName} → ${zone.name}` : `${zone.name} → ${airport.shortName}`,
      };
    }
    case "local": {
      const pkg = await prisma.localPackage.findFirst({ where: { code: search.pkg, active: true } });
      if (!pkg) return null;
      return {
        search,
        tripType: "LOCAL",
        airportDirection: null,
        pkg,
        pickupLocation: search.from,
        dropLocation: "Local (Mumbai)",
        summary: `Local rental ${pkg.name} from ${search.from}`,
      };
    }
    case "oneway":
    case "round": {
      const route = await prisma.route.findFirst({ where: { slug: search.route, active: true } });
      if (!route) return null;
      const round = search.type === "round";
      return {
        search,
        tripType: round ? "OUTSTATION_ROUND_TRIP" : "OUTSTATION_ONE_WAY",
        airportDirection: null,
        route,
        pickupLocation: route.fromCity,
        dropLocation: route.toCity,
        summary: `${route.fromCity} → ${route.toCity}${round ? " → " + route.fromCity : ""} (${round ? "Round Trip" : "One Way"})`,
      };
    }
  }
}

/** Fare for one category, or null if this category isn't priced for this trip. */
export async function quoteCategory(
  trip: ResolvedTrip,
  category: CarCategory,
  settings: Setting,
  days: number,
): Promise<FareBreakdown | null> {
  const input = await fareInput(trip, category, days);
  if (!input) return null;
  const pickupAt = istToDate(trip.search.date, trip.search.time);
  const pickupHour = pickupAt ? istParts(pickupAt).hour : 12;
  try {
    return calculateFare({ ...input, pickupHour }, category, toPricingSettings(settings));
  } catch (e) {
    if (e instanceof FareError) return null;
    throw e;
  }
}

async function fareInput(trip: ResolvedTrip, category: CarCategory, days: number): Promise<TripFareInput | null> {
  switch (trip.tripType) {
    case "AIRPORT": {
      const row = await prisma.airportFare.findUnique({
        where: {
          airportId_zoneId_categoryId: { airportId: trip.airport!.id, zoneId: trip.zone!.id, categoryId: category.id },
        },
      });
      return row ? { tripType: "AIRPORT", airportFare: row.fare } : null;
    }
    case "LOCAL": {
      const row = await prisma.localPackageFare.findUnique({
        where: { packageId_categoryId: { packageId: trip.pkg!.id, categoryId: category.id } },
      });
      return row
        ? { tripType: "LOCAL", packagePrice: row.price, packageHours: trip.pkg!.hours, packageKm: trip.pkg!.km }
        : null;
    }
    case "OUTSTATION_ONE_WAY":
      return { tripType: "OUTSTATION_ONE_WAY", distanceKm: trip.route!.distanceKm };
    case "OUTSTATION_ROUND_TRIP":
      return { tripType: "OUTSTATION_ROUND_TRIP", distanceKm: trip.route!.distanceKm, days };
    case "CORPORATE":
      return null; // corporate duties use the contract rate from the order, never retail pricing
  }
}

/** Quotes for every active category (unpriced ones are omitted). */
export async function quoteAllCategories(trip: ResolvedTrip, settings: Setting, days: number) {
  const categories = await prisma.carCategory.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const quotes = await Promise.all(
    categories.map(async (category) => ({ category, fare: await quoteCategory(trip, category, settings, days) })),
  );
  return quotes.filter((q): q is { category: CarCategory; fare: FareBreakdown } => q.fare !== null);
}

/** Simple fare table for a route landing page: one way + 1-day round trip per category. */
export async function routeFareTable(route: Route, settings: Setting) {
  const categories = await prisma.carCategory.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const s = toPricingSettings(settings);
  return categories.map((category) => {
    const oneWay = calculateFare({ tripType: "OUTSTATION_ONE_WAY", distanceKm: route.distanceKm, pickupHour: 9 }, category, s);
    const roundDays = Math.max(1, Math.ceil((route.distanceKm * 2) / settings.minKmPerDay));
    const round = calculateFare(
      { tripType: "OUTSTATION_ROUND_TRIP", distanceKm: route.distanceKm, days: roundDays, pickupHour: 9 },
      category,
      s,
    );
    return { category, oneWay: oneWay.total, round: round.total, roundDays };
  });
}
