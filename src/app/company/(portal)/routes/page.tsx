import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCompany } from "@/lib/auth/company-session";
import { saveCompanyRouteAction } from "@/actions/company";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { PageTitle, Panel, Table } from "@/components/admin/ui";

export const metadata = { title: "Routes" };

export default async function CompanyRoutesPage() {
  const company = await requireCompany();
  const [own, standard] = await Promise.all([
    prisma.companyRoute.findMany({ where: { companyId: company.id }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.route.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <>
      <PageTitle title="Routes" />
      <Panel title="Your routes">
        <p className="mb-3 text-sm text-slate-600">Regular routes for your staff, e.g. &ldquo;Morning shift: Employees&apos; homes → BKC office&rdquo;. Choose them under <strong>Book cars → Our route</strong>.</p>
        <div className="space-y-2">
          {own.map((r) => (
            <ActionForm key={r.id} action={saveCompanyRouteAction} className="grid gap-2 rounded-lg border border-slate-200 p-3 text-sm sm:grid-cols-[1.2fr_1fr_1fr_90px_auto_auto] sm:items-center">
              <input type="hidden" name="id" value={r.id} />
              <input name="name" defaultValue={r.name} className="input" aria-label="Route name" />
              <input name="fromPlace" defaultValue={r.fromPlace} className="input" aria-label="From" />
              <input name="toPlace" defaultValue={r.toPlace} className="input" aria-label="To" />
              <input name="distanceKm" type="number" min={1} defaultValue={r.distanceKm ?? ""} className="input" aria-label="Km" placeholder="km" />
              <label className="flex items-center gap-1"><input type="checkbox" name="active" defaultChecked={r.active} /> Active</label>
              <Submit className="btn-outline py-2">Save</Submit>
              <input type="hidden" name="notes" value={r.notes} />
            </ActionForm>
          ))}
        </div>
        <ActionForm action={saveCompanyRouteAction} className="mt-4 grid gap-2 border-t border-slate-100 pt-4 text-sm sm:grid-cols-[1.2fr_1fr_1fr_90px_auto]" resetOnSuccess>
          <input name="name" placeholder="Route name, e.g. Morning shift" className="input" aria-label="New route name" />
          <input name="fromPlace" placeholder="From, e.g. Employees' homes" className="input" aria-label="From" />
          <input name="toPlace" placeholder="To, e.g. BKC office" className="input" aria-label="To" />
          <input name="distanceKm" type="number" min={1} placeholder="km" className="input" aria-label="Km" />
          <input type="hidden" name="active" value="on" />
          <Submit>Add route</Submit>
        </ActionForm>
      </Panel>

      <h2 className="mt-8 mb-2 font-semibold">Outstation routes we serve</h2>
      <Table head={["Route", "Distance", "Travel time", ""]}>
        {standard.map((r) => (
          <tr key={r.id}>
            <td className="px-3 py-2 font-medium">{r.fromCity} → {r.toCity}</td>
            <td className="px-3 py-2">{r.distanceKm} km</td>
            <td className="px-3 py-2">{r.durationText}</td>
            <td className="px-3 py-2"><Link href={`/company/book?trip=OUTSTATION`} className="text-primary-700 underline">Book</Link></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
