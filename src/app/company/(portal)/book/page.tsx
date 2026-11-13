import { prisma } from "@/lib/db";
import { requireCompany } from "@/lib/auth/company-session";
import { getBookingOptions } from "@/lib/services/pricing";
import { istToday } from "@/lib/time";
import { CORP_TRIP_TYPES, type CorpTripType } from "@/lib/corporate/orders";
import { PageTitle } from "@/components/admin/ui";
import { CompanyBookingForm } from "@/components/company/CompanyBookingForm";

export const metadata = { title: "Book cars" };

export default async function CompanyBookPage({ searchParams }: { searchParams: Promise<{ trip?: string }> }) {
  const company = await requireCompany();
  const { trip } = await searchParams;
  const [options, companyRoutes, categories, employees] = await Promise.all([
    getBookingOptions(),
    prisma.companyRoute.findMany({ where: { companyId: company.id, active: true }, orderBy: { name: "asc" } }),
    prisma.carCategory.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.employee.findMany({
      where: { companyId: company.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, employeeCode: true, homeArea: true, department: true },
    }),
  ]);
  return (
    <>
      <PageTitle title="Book cars" />
      <CompanyBookingForm
        today={istToday()}
        initialTrip={(CORP_TRIP_TYPES as readonly string[]).includes(trip ?? "") ? (trip as CorpTripType) : undefined}
        airports={options.airports}
        packages={options.packages}
        routes={options.routes}
        companyRoutes={companyRoutes}
        categories={categories.map((c) => ({ id: c.id, name: c.name, seats: c.seats, luggage: c.luggage, exampleModels: c.exampleModels }))}
        employees={employees}
      />
    </>
  );
}
