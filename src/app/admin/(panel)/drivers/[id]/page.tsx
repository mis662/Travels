import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { DriverForm } from "@/components/admin/forms";
import { PageTitle, Panel } from "@/components/admin/ui";

export const metadata = { title: "Edit driver" };

export default async function EditDriver({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const driver = await prisma.driver.findUnique({ where: { id: (await params).id } });
  if (!driver) notFound();
  return (
    <>
      <Link href="/admin/drivers" className="text-sm text-primary-700 hover:underline">← Drivers</Link>
      <PageTitle title={`Edit ${driver.name}`} />
      <Panel><DriverForm driver={driver} /></Panel>
      <p className="mt-3 text-sm text-slate-500">To deactivate a driver, untick “Active” and save. Past bookings keep their driver.</p>
    </>
  );
}
