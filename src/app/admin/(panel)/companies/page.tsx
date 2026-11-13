import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/session";
import { PageTitle, Panel, Table } from "@/components/admin/ui";
import { CompanyForm } from "./CompanyForm";

export const metadata = { title: "Companies" };

export default async function CompaniesPage() {
  await requireSuperAdmin();
  const [companies, admins] = await Promise.all([
    prisma.company.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: {
        manager: { select: { name: true } },
        _count: { select: { employees: true, orders: { where: { status: { in: ["NEW", "IN_PROGRESS"] } } } } },
      },
    }),
    prisma.adminUser.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }),
  ]);
  return (
    <>
      <PageTitle title="Corporate companies" />
      <Table head={["Company", "User ID", "Contact", "Employees", "Open bookings", "Default sub-admin", "Status", ""]} empty={companies.length === 0}>
        {companies.map((c) => (
          <tr key={c.id} className={c.active ? "" : "opacity-60"}>
            <td className="px-3 py-2 font-medium">{c.name}{c.gstNumber && <span className="block text-xs text-slate-500">GST {c.gstNumber}</span>}</td>
            <td className="px-3 py-2 font-mono text-xs">{c.loginId ?? "—"}{c.mustChangePassword && <span className="block font-sans text-amber-700">first login pending</span>}</td>
            <td className="px-3 py-2">{c.contactName}<span className="block text-xs text-slate-500">{c.contactPhone}</span></td>
            <td className="px-3 py-2">{c._count.employees}</td>
            <td className="px-3 py-2">{c._count.orders}</td>
            <td className="px-3 py-2">{c.manager?.name ?? "—"}</td>
            <td className="px-3 py-2">{c.active ? "Active" : "Inactive"}</td>
            <td className="px-3 py-2"><Link href={`/admin/companies/${c.id}`} className="text-primary-700 underline">Open</Link></td>
          </tr>
        ))}
      </Table>
      <Panel title="Create a company account" className="mt-6"><CompanyForm admins={admins} /></Panel>
    </>
  );
}
