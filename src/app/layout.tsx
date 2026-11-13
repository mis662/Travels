import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { getSettings } from "@/lib/services/settings";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: `${s.businessName} – Mumbai Cabs, Airport Taxi & Outstation Cars`, template: `%s | ${s.businessName}` },
    description: siteConfig.description,
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: s.businessName,
      title: `${s.businessName} – Mumbai Cabs & Outstation Taxi`,
      description: siteConfig.description,
    },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = {
  themeColor: "#1e2c89",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" data-scroll-behavior="smooth">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
