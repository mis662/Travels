/**
 * Seeds car categories, pricing, airports/zones, outstation routes, a demo
 * driver & vehicle, business settings and the first admin user.
 * Safe to run repeatedly: rows are upserted by their unique slug/code, and
 * existing prices are NOT overwritten (so admin edits survive a re-seed).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const categories = [
  { slug: "hatchback", name: "Hatchback", exampleModels: "Swift, WagonR", seats: 4, luggage: 2, perKmRate: 11, baseFare: 2000, driverAllowancePerDay: 300, localExtraKmRate: 12, localExtraHourRate: 120, imageUrl: "/cars/hatchback.svg", description: "Budget-friendly for city rides and small families." },
  { slug: "sedan", name: "Sedan", exampleModels: "Dzire, Etios, Aura", seats: 4, luggage: 3, perKmRate: 12, baseFare: 2500, driverAllowancePerDay: 300, localExtraKmRate: 13, localExtraHourRate: 140, imageUrl: "/cars/sedan.svg", description: "Comfortable choice for airport runs and outstation trips." },
  { slug: "suv", name: "SUV", exampleModels: "Ertiga, Kia Carens", seats: 6, luggage: 3, perKmRate: 15, baseFare: 3000, driverAllowancePerDay: 400, localExtraKmRate: 16, localExtraHourRate: 180, imageUrl: "/cars/suv.svg", description: "Spacious 6-seater for families and groups." },
  { slug: "premium-suv", name: "Premium SUV", exampleModels: "Innova Crysta", seats: 7, luggage: 4, perKmRate: 19, baseFare: 4000, driverAllowancePerDay: 400, localExtraKmRate: 20, localExtraHourRate: 220, imageUrl: "/cars/premium-suv.svg", description: "India's favourite long-distance family car." },
  { slug: "luxury", name: "Luxury", exampleModels: "Fortuner, Mercedes E-Class, BMW 5 Series", seats: 4, luggage: 3, perKmRate: 40, baseFare: 10000, driverAllowancePerDay: 600, localExtraKmRate: 45, localExtraHourRate: 600, imageUrl: "/cars/luxury.svg", description: "Premium cars for corporate guests, weddings and events." },
  { slug: "tempo-traveller", name: "Tempo Traveller", exampleModels: "Force Tempo Traveller (12 / 17 seater)", seats: 17, luggage: 10, perKmRate: 26, baseFare: 6000, driverAllowancePerDay: 500, localExtraKmRate: 28, localExtraHourRate: 350, imageUrl: "/cars/tempo-traveller.svg", description: "Push-back seats for group tours and pilgrimages." },
  { slug: "mini-bus", name: "Mini Bus", exampleModels: "20 – 35 seater bus", seats: 35, luggage: 20, perKmRate: 40, baseFare: 9000, driverAllowancePerDay: 600, localExtraKmRate: 45, localExtraHourRate: 500, imageUrl: "/cars/mini-bus.svg", description: "For large groups, corporate outings and weddings." },
];

const localPackages = [
  { code: "4-40", name: "4 hr / 40 km", hours: 4, km: 40, sortOrder: 1 },
  { code: "8-80", name: "8 hr / 80 km", hours: 8, km: 80, sortOrder: 2 },
  { code: "12-120", name: "12 hr / 120 km", hours: 12, km: 120, sortOrder: 3 },
];

// price per package code, per category slug
const localPrices: Record<string, [number, number, number]> = {
  hatchback: [1100, 1900, 2800],
  sedan: [1300, 2200, 3200],
  suv: [1700, 2900, 4200],
  "premium-suv": [2300, 3800, 5500],
  luxury: [6000, 10000, 14500],
  "tempo-traveller": [3200, 5500, 8000],
  "mini-bus": [5000, 8500, 12500],
};

const airports = [
  { slug: "csmia-t1", name: "Mumbai Airport (CSMIA) – Terminal 1", shortName: "CSMIA T1", sortOrder: 1, group: "BOM" },
  { slug: "csmia-t2", name: "Mumbai Airport (CSMIA) – Terminal 2", shortName: "CSMIA T2", sortOrder: 2, group: "BOM" },
  { slug: "navi-mumbai-airport", name: "Navi Mumbai International Airport", shortName: "Navi Mumbai Airport", sortOrder: 3, group: "NMI" },
] as const;

const zones = [
  { slug: "western-suburbs", name: "Western Suburbs", areas: "Bandra, Andheri, Goregaon, Malad, Borivali", sortOrder: 1 },
  { slug: "south-mumbai", name: "South Mumbai", areas: "Colaba, Fort, Churchgate, Worli, Dadar", sortOrder: 2 },
  { slug: "central-suburbs", name: "Central Suburbs", areas: "Kurla, Ghatkopar, Powai, Chembur, Mulund", sortOrder: 3 },
  { slug: "thane", name: "Thane", areas: "Thane West, Thane East, Ghodbunder Road", sortOrder: 4 },
  { slug: "navi-mumbai", name: "Navi Mumbai", areas: "Vashi, Nerul, Belapur, Kharghar, Panvel", sortOrder: 5 },
];

// Sedan fare by airport group and zone; other categories use a multiplier.
const sedanAirportFares: Record<"BOM" | "NMI", Record<string, number>> = {
  BOM: { "western-suburbs": 800, "south-mumbai": 1300, "central-suburbs": 1000, thane: 1300, "navi-mumbai": 1600 },
  NMI: { "western-suburbs": 1800, "south-mumbai": 2000, "central-suburbs": 1500, thane: 1300, "navi-mumbai": 700 },
};
const categoryMultiplier: Record<string, number> = {
  hatchback: 0.9, sedan: 1, suv: 1.3, "premium-suv": 1.7, luxury: 4.5, "tempo-traveller": 2.8, "mini-bus": 4.5,
};

const routes = [
  { toCity: "Pune", distanceKm: 150, durationText: "3 – 3.5 hrs", popular: true },
  { toCity: "Lonavala", distanceKm: 83, durationText: "2 hrs", popular: true },
  { toCity: "Nashik", distanceKm: 167, durationText: "3.5 – 4 hrs", popular: true },
  { toCity: "Shirdi", distanceKm: 240, durationText: "5 – 5.5 hrs", popular: true },
  { toCity: "Mahabaleshwar", distanceKm: 265, durationText: "5.5 – 6 hrs", popular: true },
  { toCity: "Alibaug", distanceKm: 95, durationText: "2.5 – 3 hrs", popular: false },
  { toCity: "Goa", distanceKm: 590, durationText: "11 – 12 hrs", popular: true },
  { toCity: "Lavasa", distanceKm: 190, durationText: "4 hrs", popular: false },
  { toCity: "Igatpuri", distanceKm: 121, durationText: "2.5 – 3 hrs", popular: false },
  { toCity: "Surat", distanceKm: 285, durationText: "5.5 – 6 hrs", popular: false },
];

const round50 = (n: number) => Math.round(n / 50) * 50;
const daysFromNow = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);

async function main() {
  await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      businessName: "[Your Brand Name]",
      tagline: "Trusted cabs in Mumbai — Airport, Local & Outstation",
      phonePrimary: "+91-7254071503",
      phoneSecondary: "+91-9322638335",
      whatsappPrimary: "+91-7254071503",
      whatsappSecondary: "+91-9322638335",
      email: "info@yourdomain.com",
      address: "[Your address], Mumbai, Maharashtra",
      advanceBookingHours: 2,
      cancellationCutoffHours: 6,
      nightCharge: 300,
      nightStartHour: 22,
      nightEndHour: 6,
      gstPercent: 5,
      minKmPerDay: 250,
      oneWayMinKm: 150,
    },
  });

  const catIds: Record<string, string> = {};
  for (const [i, c] of categories.entries()) {
    const row = await prisma.carCategory.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, sortOrder: i + 1 },
    });
    catIds[c.slug] = row.id;
  }

  for (const [pi, p] of localPackages.entries()) {
    const pkg = await prisma.localPackage.upsert({ where: { code: p.code }, update: {}, create: p });
    for (const [slug, prices] of Object.entries(localPrices)) {
      await prisma.localPackageFare.upsert({
        where: { packageId_categoryId: { packageId: pkg.id, categoryId: catIds[slug] } },
        update: {},
        create: { packageId: pkg.id, categoryId: catIds[slug], price: prices[pi] },
      });
    }
  }

  const zoneIds: Record<string, string> = {};
  for (const z of zones) {
    const row = await prisma.airportZone.upsert({ where: { slug: z.slug }, update: {}, create: z });
    zoneIds[z.slug] = row.id;
  }

  for (const a of airports) {
    const { group, ...data } = a;
    const airport = await prisma.airport.upsert({ where: { slug: a.slug }, update: {}, create: data });
    for (const [zoneSlug, sedanFare] of Object.entries(sedanAirportFares[group])) {
      for (const [catSlug, mult] of Object.entries(categoryMultiplier)) {
        await prisma.airportFare.upsert({
          where: {
            airportId_zoneId_categoryId: { airportId: airport.id, zoneId: zoneIds[zoneSlug], categoryId: catIds[catSlug] },
          },
          update: {},
          create: { airportId: airport.id, zoneId: zoneIds[zoneSlug], categoryId: catIds[catSlug], fare: round50(sedanFare * mult) },
        });
      }
    }
  }

  for (const [i, r] of routes.entries()) {
    const slug = `mumbai-to-${r.toCity.toLowerCase()}`;
    await prisma.route.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        fromCity: "Mumbai",
        toCity: r.toCity,
        distanceKm: r.distanceKm,
        durationText: r.durationText,
        popular: r.popular,
        sortOrder: i + 1,
        seoTitle: `Mumbai to ${r.toCity} Cab – One Way & Round Trip Taxi`,
        seoDescription: `Book a Mumbai to ${r.toCity} cab from ₹${r.distanceKm * 11}. ${r.distanceKm} km, ${r.durationText}. Sedan, SUV, Innova Crysta & Tempo Traveller. Verified drivers, pay after the trip.`,
        description: `Travel from Mumbai to ${r.toCity} (${r.distanceKm} km, about ${r.durationText}) in a clean, air-conditioned cab with an experienced outstation driver. Choose a one way drop or a round trip, and pay after your journey.`,
      },
    });
  }

  // Demo driver can log in to the driver app (/driver) with mobile 9876543210 and PIN 1234
  const driver = await prisma.driver.findFirst({ where: { phone: "9876543210" } });
  if (!driver) {
    await prisma.driver.create({
      data: {
        name: "Ramesh Patil (Demo)",
        phone: "9876543210",
        licenceNumber: "MH02 20150012345",
        licenceExpiry: daysFromNow(400),
        policeVerification: "VERIFIED",
        pinHash: await bcrypt.hash("1234", 12),
      },
    });
  } else if (!driver.pinHash) {
    await prisma.driver.update({ where: { id: driver.id }, data: { pinHash: await bcrypt.hash("1234", 12) } });
  }

  await prisma.vehicle.upsert({
    where: { registrationNumber: "MH02AB1234" },
    update: {},
    create: {
      registrationNumber: "MH02AB1234",
      model: "Maruti Dzire (Demo)",
      categoryId: catIds.sedan,
      ownerName: "Own",
      permitExpiry: daysFromNow(20), // deliberately close, to show the expiry warning
      insuranceExpiry: daysFromNow(200),
    },
  });

  const email = (process.env.ADMIN_EMAIL || "admin@yourdomain.com").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "ChangeMe@123";
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (!existing) {
    await prisma.adminUser.create({
      data: { email, name: process.env.ADMIN_NAME || "Admin", passwordHash: await bcrypt.hash(password, 12) },
    });
    console.log(`Created admin user ${email}`);
  } else {
    console.log(`Admin user ${email} already exists (password unchanged)`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
