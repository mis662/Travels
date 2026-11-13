import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/session";
import { RouteForm } from "@/components/admin/forms";
import { PageTitle, Panel } from "@/components/admin/ui";

export const metadata = { title: "Route" };

export default async function RoutePage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  const route = id === "new" ? undefined : await prisma.route.findUnique({ where: { id } });
  if (id !== "new" && !route) notFound();
  return (
    <>
      <Link href="/admin/routes" className="text-sm text-primary-700 hover:underline">← Routes</Link>
      <PageTitle title={route ? `Mumbai → ${route.toCity}` : "New route"} />
      <Panel><RouteForm route={route ?? undefined} /></Panel>
      <p className="mt-3 text-sm text-slate-500">Each active route gets its own SEO landing page at /routes/&lt;slug&gt; and appears in the booking widget and sitemap.</p>
    </>
  );
}
