import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCompany } from "@/lib/auth/company-session";
import { formatDate, formatDateTime, telHref } from "@/lib/format";
import { corpTripLabel, orderTypeLabel } from "@/lib/corporate/orders";
import { cancelCompanyOrderAction } from "@/actions/company";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { PageTitle, Panel, StatusBadge, Table } from "@/components/admin/ui";
import { OrderStatusBadge } from "@/components/corporate/OrderStatusBadge";

export const metadata = { title: "Booking" };

export default async function CompanyOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string }> }) {
  const company = await requireCompany();
  const [{ id }, { placed }] = await Promise.all([params, searchParams]);
  const order = await prisma.corporateOrder.findFirst({
    where: { id, companyId: company.id },
    include: {
      cars: {
        orderBy: { position: "asc" },
        include: {
          category: true,
          driver: true,
          vehicle: true,
          passengers: { include: { employee: true }, orderBy: { pickupOrder: "asc" } },
        },
      },
      duties: { orderBy: { pickupAt: "asc" }, include: { driver: true, orderCar: { select: { position: true } } }, take: 400 },
    },
  });
  if (!order) notFound();

  return (
    <>
      <Link href="/company/orders" className="text-sm text-primary-700 hover:underline">← Bookings</Link>
      <PageTitle title={order.code}><OrderStatusBadge status={order.status} /></PageTitle>
      {placed && (
        <p role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Booking placed! We&apos;ll assign drivers — you and your employees will see the driver details here once assigned.
        </p>
      )}

      <Panel>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div><dt className="text-slate-500">Trip</dt><dd className="font-medium">{corpTripLabel(order.tripType)} · {order.tripSummary}</dd></div>
          <div><dt className="text-slate-500">When</dt><dd className="font-medium">{orderTypeLabel(order.orderType)}: {formatDate(order.startDate)}{order.endDate.getTime() !== order.startDate.getTime() && ` – ${formatDate(order.endDate)}`} at {order.reportingTime}{order.skipSundays && " (no Sundays)"}</dd></div>
          <div><dt className="text-slate-500">Booked</dt><dd className="font-medium">{formatDateTime(order.createdAt)}</dd></div>
          {order.requirements && <div className="sm:col-span-3"><dt className="text-slate-500">Notes</dt><dd className="font-medium whitespace-pre-wrap">{order.requirements}</dd></div>}
        </dl>
      </Panel>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {order.cars.map((car) => (
          <section key={car.id} className="card p-4" aria-label={`Car ${car.position}`}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-primary-900">Car {car.position}</h2>
              <span className="text-sm text-slate-600">{car.category.name} · {car.passengers.length}/{car.category.seats} seats</span>
            </div>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm">
              {car.passengers.map((p) => (
                <li key={p.id}><strong>{p.employee.name}</strong> <span className="text-slate-500">· {p.employee.homeArea || p.employee.homeAddress}</span></li>
              ))}
            </ol>
            <div className={`mt-3 rounded-lg p-3 text-sm ${car.driver ? "bg-indigo-50" : "bg-amber-50 text-amber-900"}`}>
              {car.driver ? (
                <>
                  <p className="font-semibold text-indigo-900">Driver</p>
                  <p>{car.driver.name} · <a href={telHref(`+91${car.driver.phone}`)} className="text-primary-700 underline">{car.driver.phone}</a></p>
                  {car.vehicle && <p>{car.vehicle.model} · <span className="font-mono">{car.vehicle.registrationNumber}</span></p>}
                </>
              ) : (
                "Driver not assigned yet."
              )}
            </div>
          </section>
        ))}
      </div>

      {order.duties.length > 0 && (
        <>
          <h2 className="mt-8 mb-2 font-semibold">Daily duties</h2>
          <Table head={["Date & time", "Car", "Employees", "Driver", "Status"]}>
            {order.duties.map((d) => (
              <tr key={d.id}>
                <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(d.pickupAt)}</td>
                <td className="px-3 py-2">Car {d.orderCar?.position}</td>
                <td className="px-3 py-2">{d.customerName}</td>
                <td className="px-3 py-2">{d.driver?.name ?? "—"}</td>
                <td className="px-3 py-2"><StatusBadge status={d.status} /></td>
              </tr>
            ))}
          </Table>
        </>
      )}

      {order.status === "NEW" && (
        <ActionForm action={cancelCompanyOrderAction} className="mt-6" confirm="Cancel this booking?">
          <input type="hidden" name="orderId" value={order.id} />
          <Submit className="btn-outline text-red-700">Cancel booking</Submit>
        </ActionForm>
      )}
    </>
  );
}
