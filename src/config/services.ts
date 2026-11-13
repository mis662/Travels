import type { FaqItem } from "@/components/site/Faq";

export type ServiceSlug = "airport-transfer" | "local-rental" | "outstation" | "wedding-cars" | "tempo-traveller";

export interface ServiceContent {
  slug: ServiceSlug;
  title: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  features: string[];
  /** Booking widget tab to open; null = enquiry form instead */
  widget: "airport" | "local" | "oneway" | null;
  /** Car category slugs to highlight */
  categories?: string[];
  faqs: FaqItem[];
}

export const services: Record<ServiceSlug, ServiceContent> = {
  "airport-transfer": {
    slug: "airport-transfer",
    title: "Mumbai Airport Taxi – Pickup & Drop",
    metaTitle: "Mumbai Airport Taxi | CSMIA T1, T2 & Navi Mumbai Airport Cab",
    metaDescription: "Fixed-fare airport pickup and drop for Mumbai Airport (CSMIA T1/T2) and Navi Mumbai International Airport. Sedan, SUV, Innova Crysta. Book online, pay after the trip.",
    intro: "Fixed-fare airport transfers between Mumbai Airport (CSMIA Terminal 1 & 2) or Navi Mumbai International Airport and anywhere in Mumbai, Thane and Navi Mumbai. Your driver tracks your flight and waits at the arrival gate.",
    features: ["Fixed zone-wise fares – no surge pricing", "Flight tracking for delayed arrivals", "Meet & greet at arrival gate on request", "Clean, air-conditioned cars with luggage space", "Early-morning and late-night pickups"],
    widget: "airport",
    faqs: [
      { q: "How much waiting time is included for airport pickup?", a: "We include 45 minutes of free waiting after your flight lands. Further waiting is charged at a nominal hourly rate." },
      { q: "Is airport parking included?", a: "Airport parking and entry charges are extra as actual and paid to the driver." },
      { q: "What if my flight is delayed?", a: "Share your flight number in Special Requests. We track the flight and adjust the pickup time at no extra cost." },
    ],
  },
  "local-rental": {
    slug: "local-rental",
    title: "Local Car Rental in Mumbai – Hourly Packages",
    metaTitle: "Local Car Rental Mumbai | 4hr/40km, 8hr/80km, 12hr/120km Packages",
    metaDescription: "Hire a cab with driver in Mumbai by the hour. 4 hr/40 km, 8 hr/80 km and 12 hr/120 km packages for shopping, meetings and city tours. Transparent extra km/hour rates.",
    intro: "Keep a car and driver at your disposal for meetings, shopping, hospital visits or a Mumbai city tour. Choose a package, and pay for extra kilometres or hours only if you use them.",
    features: ["4 hr/40 km, 8 hr/80 km and 12 hr/120 km packages", "Unlimited stops within the city", "Clear extra km and extra hour rates", "Ideal for corporate visits and sightseeing", "Hatchback to luxury cars"],
    widget: "local",
    faqs: [
      { q: "When does the package time start?", a: "Package time and kilometres are counted from our garage to garage, or from your pickup point if you prefer — this is confirmed on call." },
      { q: "Can I travel outside Mumbai on a local package?", a: "Local packages are for Mumbai, Thane and Navi Mumbai. For trips outside the city, please book an outstation trip." },
    ],
  },
  outstation: {
    slug: "outstation",
    title: "Outstation Cabs from Mumbai – One Way & Round Trip",
    metaTitle: "Outstation Cabs from Mumbai | One Way & Round Trip Taxi",
    metaDescription: "Book outstation taxis from Mumbai to Pune, Lonavala, Nashik, Shirdi, Mahabaleshwar, Goa and more. One way drops and round trips with experienced highway drivers.",
    intro: "Travel from Mumbai to Pune, Lonavala, Nashik, Shirdi, Mahabaleshwar, Alibaug, Goa and more with experienced highway drivers. Choose a one-way drop or a round trip with the car waiting for you.",
    features: ["One way drops and round trips", "Experienced ghat and highway drivers", "Driver allowance shown upfront", "Per-km pricing with clear minimums", "Sedan, SUV, Innova Crysta, Tempo Traveller"],
    widget: "oneway",
    faqs: [
      { q: "How is a round trip fare calculated?", a: "Round trips are charged on the higher of actual kilometres or a minimum of 250 km per day, multiplied by the per-km rate, plus a daily driver allowance." },
      { q: "Are tolls and state taxes included?", a: "Toll, parking and state entry tax (for example when entering Goa or Gujarat) are extra as actual." },
      { q: "Where does the driver stay overnight?", a: "The driver allowance covers the driver's food and stay. You don't need to arrange anything." },
    ],
  },
  "wedding-cars": {
    slug: "wedding-cars",
    title: "Wedding & Event Cars in Mumbai",
    metaTitle: "Wedding Car Rental Mumbai | Luxury Cars for Weddings & Events",
    metaDescription: "Rent decorated luxury cars for weddings, receptions and events in Mumbai – Mercedes, BMW, Fortuner, Innova Crysta and guest transport with Tempo Travellers.",
    intro: "Make an entrance with a Mercedes E-Class, BMW 5 Series or Fortuner, and move your guests comfortably with Innova Crystas, Tempo Travellers and mini buses. We coordinate the whole fleet so your day runs on time.",
    features: ["Luxury cars for bride & groom", "Floral decoration on request", "Guest shuttles between venue and hotels", "Uniformed, courteous chauffeurs", "Single point of contact for the whole event"],
    widget: null,
    categories: ["luxury", "premium-suv", "tempo-traveller", "mini-bus"],
    faqs: [
      { q: "Can you decorate the wedding car?", a: "Yes. Floral decoration can be arranged at extra cost — mention your preference in the enquiry." },
      { q: "How early should we book?", a: "For wedding season dates, we recommend booking at least 2–4 weeks in advance, especially for luxury cars." },
    ],
  },
  "tempo-traveller": {
    slug: "tempo-traveller",
    title: "Tempo Traveller & Mini Bus on Rent in Mumbai",
    metaTitle: "Tempo Traveller on Rent Mumbai | 12, 17 Seater & Mini Bus Hire",
    metaDescription: "Hire 12 and 17 seater Tempo Travellers and 20–35 seater mini buses in Mumbai for group tours, pilgrimages, corporate outings and weddings.",
    intro: "Travelling as a group? Our push-back-seat Tempo Travellers (12/17 seater) and 20–35 seater mini buses are ideal for family trips, pilgrimages to Shirdi and Nashik, corporate offsites and wedding guests.",
    features: ["12 and 17 seater Tempo Travellers", "20 – 35 seater mini buses", "Push-back seats and ample luggage space", "Experienced group-travel drivers", "Local, airport and outstation trips"],
    widget: "oneway",
    categories: ["tempo-traveller", "mini-bus"],
    faqs: [
      { q: "Can I book a Tempo Traveller for local use?", a: "Yes — choose the Local tab in the booking form and select Tempo Traveller or Mini Bus on the next page." },
      { q: "Is the 12 seater cheaper than the 17 seater?", a: "Yes. Prices shown online are for the 17 seater; mention 12 seater in Special Requests and we'll confirm the revised fare." },
    ],
  },
};

export const serviceSlugs = Object.keys(services) as ServiceSlug[];
