/**
 * Static brand configuration. Business contact details shown on the site are
 * stored in the database (Admin → Settings); the values below are the
 * defaults used by the seed script and as a fallback.
 *
 * Brand colours live in src/app/theme.css.
 */
export const siteConfig = {
  name: "[Your Brand Name]",
  tagline: "Trusted cabs in Mumbai — Airport, Local & Outstation",
  description:
    "Book reliable taxis in Mumbai for airport transfers, local hourly rentals, outstation trips to Pune, Lonavala, Nashik, Shirdi, Goa and more. Transparent fares, verified drivers, pay after your trip.",
  city: "Mumbai",
  phones: ["+91-7254071503", "+91-9322638335"],
  whatsapp: ["+91-7254071503", "+91-9322638335"],
  email: "info@yourdomain.com",
  address: "[Your address], Mumbai, Maharashtra",
  url: process.env.APP_URL || "http://localhost:3000",
  bookingCodePrefix: "MUM",
  paymentNote:
    "Pay directly to the driver or our office after the trip. Final fare confirmed on call/WhatsApp.",
};

export const mainNav = [
  { href: "/services/airport-transfer", label: "Airport" },
  { href: "/services/local-rental", label: "Local" },
  { href: "/services/outstation", label: "Outstation" },
  { href: "/fleet", label: "Fleet" },
  { href: "/routes", label: "Routes" },
  { href: "/track", label: "Track Booking" },
  { href: "/contact", label: "Contact" },
];

export const serviceLinks = [
  { href: "/services/airport-transfer", label: "Airport Transfer" },
  { href: "/services/local-rental", label: "Local Rental" },
  { href: "/services/outstation", label: "Outstation Cabs" },
  { href: "/services/wedding-cars", label: "Wedding & Event Cars" },
  { href: "/services/tempo-traveller", label: "Tempo Traveller & Mini Bus" },
];
