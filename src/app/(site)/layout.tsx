import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/services/settings";
import { getCurrentCustomer } from "@/lib/auth/customer-session";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileContactBar } from "@/components/site/MobileContactBar";
import { JsonLd, localBusinessSchema } from "@/components/site/JsonLd";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, customer, routes] = await Promise.all([
    getSettings(),
    getCurrentCustomer(),
    prisma.route.findMany({
      where: { active: true },
      orderBy: [{ popular: "desc" }, { sortOrder: "asc" }],
      select: { slug: true, toCity: true },
    }),
  ]);
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3">
        Skip to content
      </a>
      <Header settings={settings} customerName={customer?.name} />
      <main id="main">{children}</main>
      <Footer settings={settings} routes={routes} />
      <MobileContactBar phone={settings.phonePrimary} whatsapp={settings.whatsappPrimary} />
      <JsonLd data={localBusinessSchema(settings)} />
    </>
  );
}
