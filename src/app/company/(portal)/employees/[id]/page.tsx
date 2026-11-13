import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCompany } from "@/lib/auth/company-session";
import { PageTitle, Panel } from "@/components/admin/ui";
import { EmployeeForm } from "@/components/company/EmployeeForm";

export const metadata = { title: "Edit employee" };

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const company = await requireCompany();
  const employee = await prisma.employee.findFirst({ where: { id: (await params).id, companyId: company.id } });
  if (!employee) notFound();
  return (
    <>
      <Link href="/company/employees" className="text-sm text-primary-700 hover:underline">← Employees</Link>
      <PageTitle title={`Edit ${employee.name}`} />
      <Panel><EmployeeForm employee={employee} /></Panel>
    </>
  );
}
