import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/session";
import { CategoryForm } from "@/components/admin/forms";
import { CarImage } from "@/components/site/CarCard";
import { PageTitle, Panel } from "@/components/admin/ui";

export const metadata = { title: "Car category" };

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  const category = id === "new" ? undefined : await prisma.carCategory.findUnique({ where: { id } });
  if (id !== "new" && !category) notFound();
  return (
    <>
      <Link href="/admin/pricing" className="text-sm text-primary-700 hover:underline">← Cars & Pricing</Link>
      <PageTitle title={category ? `Edit ${category.name}` : "New car category"} />
      {category && <div className="mb-4 w-64"><CarImage car={category} /></div>}
      <Panel><CategoryForm category={category ?? undefined} /></Panel>
      <p className="mt-3 text-sm text-slate-500">
        After creating a category, set its local package and airport fares on the Cars &amp; Pricing page. Outstation fares use the per-km rate automatically.
        Images: put files in <code>public/cars/</code> and use <code>/cars/file.jpg</code>, or paste a full image URL.
      </p>
    </>
  );
}
