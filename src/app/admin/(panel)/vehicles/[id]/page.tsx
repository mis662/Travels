import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { VehicleForm } from "@/components/admin/forms";
import { PageTitle, Panel } from "@/components/admin/ui";

export const metadata = { title: "Edit vehicle" };

export default async function EditVehicle({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const [vehicle, categories] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id: (await params).id } }),
    prisma.carCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!vehicle) notFound();
  return (
    <>
      <Link href="/admin/vehicles" className="text-sm text-primary-700 hover:underline">← Vehicles</Link>
      <PageTitle title={`Edit ${vehicle.registrationNumber}`} />
      <Panel><VehicleForm vehicle={vehicle} categories={categories} /></Panel>
    </>
  );
}
