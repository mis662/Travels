import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCompany } from "@/lib/auth/company-session";
import { homeMapUrl } from "@/lib/corporate/orders";
import { PageTitle, Panel, Table } from "@/components/admin/ui";
import { EmployeeForm } from "@/components/company/EmployeeForm";

export const metadata = { title: "Employees" };

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ q?: string; added?: string }> }) {
  const company = await requireCompany();
  const { q, added } = await searchParams;
  const term = q?.trim();
  const employees = await prisma.employee.findMany({
    where: {
      companyId: company.id,
      ...(term ? { OR: [{ name: { contains: term } }, { mobile: { contains: term } }, { employeeCode: { contains: term } }, { homeArea: { contains: term } }] } : {}),
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return (
    <>
      <PageTitle title={`Employees (${employees.length})`} />
      {added && <p role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">Employee added. Share their mobile number and password so they can sign in at /employee.</p>}
      <form className="mb-4 flex gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Search name, mobile, code, area" className="input max-w-sm" aria-label="Search employees" />
        <button className="btn-primary">Search</button>
      </form>
      <Table head={["Name", "Code", "Mobile", "Home location", "Department", "Status", ""]} empty={employees.length === 0}>
        {employees.map((e) => (
          <tr key={e.id} className={e.active ? "" : "opacity-60"}>
            <td className="px-3 py-2 font-medium">{e.name}</td>
            <td className="px-3 py-2">{e.employeeCode}</td>
            <td className="px-3 py-2">{e.mobile}</td>
            <td className="px-3 py-2">
              {e.homeArea && <strong>{e.homeArea}: </strong>}{e.homeAddress}
              <a href={homeMapUrl(e)} target="_blank" rel="noopener noreferrer" className="ml-1 text-xs text-primary-700 underline">map</a>
            </td>
            <td className="px-3 py-2">{e.department}</td>
            <td className="px-3 py-2">{e.active ? "Active" : "Inactive"}</td>
            <td className="px-3 py-2"><Link href={`/company/employees/${e.id}`} className="text-primary-700 underline">Edit</Link></td>
          </tr>
        ))}
      </Table>
      <Panel title="Add employee" className="mt-6"><EmployeeForm /></Panel>
    </>
  );
}
