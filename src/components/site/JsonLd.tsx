import { siteConfig } from "@/config/site";
import type { PublicSettings } from "@/lib/services/settings";

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Escape "<" so user-editable settings can't break out of the script tag
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function localBusinessSchema(s: PublicSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "TaxiService",
    name: s.businessName,
    description: siteConfig.description,
    url: siteConfig.url,
    telephone: s.phonePrimary,
    email: s.email,
    areaServed: ["Mumbai", "Thane", "Navi Mumbai", "Pune", "Maharashtra"],
    provider: {
      "@type": "LocalBusiness",
      name: s.businessName,
      telephone: [s.phonePrimary, s.phoneSecondary].filter(Boolean),
      email: s.email,
      url: siteConfig.url,
      image: `${siteConfig.url}/opengraph-image`,
      priceRange: "₹₹",
      address: {
        "@type": "PostalAddress",
        streetAddress: s.address,
        addressLocality: "Mumbai",
        addressRegion: "Maharashtra",
        addressCountry: "IN",
      },
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "00:00",
        closes: "23:59",
      },
    },
  };
}
