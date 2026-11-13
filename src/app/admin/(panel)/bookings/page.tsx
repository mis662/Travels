import Link from "next/link";
import { prisma } from "@/lib/db";
import { bookingScope, requireAdmin } from "@/lib/auth/session";
import { bookingWhere, filtersToQuery, readFilters } from "@/lib/services/admin-bookings";
import { BOOKING_STATUSES, STATUS_LABELS, TRIP_TYPES, TRIP_TYPE_LABELS } from "@/lib/booking/status";
import { formatDateTime, formatINR } from "@/lib/format";
import { PageTitle, StatusBadge, Table } from "@/components/admin/ui";

export const metadata = { title: "Bookings" };
const PAGE_SIZE = 25;

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin();
  const filters = readFilters(await searchParams);
  const page = Math.max(1, Number(filters.page) || 1);
  const where = { AND: [bookingWhere(filters), bookingScope(admin)] };
  const [bookings, total, categories] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { category: true, driver: true },
      orderBy: { pickupAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.booking.count({ where }),
    prisma.carCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageTitle title={`Bookings (${total})`}>
        <a href={`/admin/bookings/export?${filtersToQuery(filters, { page: undefined })}`} className="btn-outline">Export CSV</a>
      </PageTitle>

      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-7" role="search">
        <input name="q" defaultValue={filters.q} placeholder="ID, name, mobile, email" className="input lg:col-span-2" aria-label="Search" />
        <select name="status" defaultValue={filters.status ?? ""} className="input" aria-label="Status">
          <option value="">All statuses</option>
          {BOOKING_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select name="tripType" defaultValue={filters.tripType ?? ""} className="input" aria-label="Trip type">
          <option value="">All trip types</option>
          {TRIP_TYPES.map((t) => <option key={t} value={t}>{TRIP_TYPE_LABELS[t]}</option>)}
        </select>
        <select name="categoryId" defaultValue={filters.categoryId ?? ""} className="input" aria-label="Car">
          <option value="">All cars</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" name="from" defaultValue={filters.from} className="input" aria-label="Pickup from" title="Pickup from" />
        <input type="date" name="to" defaultValue={filters.to} className="input" aria-label="Pickup to" title="Pickup to" />
        <div className="flex gap-2 sm:col-span-3 lg:col-span-7">
          <button className="btn-primary">Filter</button>
          <Link href="/admin/bookings" className="btn-outline">Reset</Link>
        </div>
      </form>

      <Table head={["Booking", "Pickup", "Customer", "Trip", "Car / Driver", "Fare", "Status"]} empty={bookings.length === 0}>
        {bookings.map((b) => (
          <tr key={b.id} className="hover:bg-slate-50">
            <td className="px-3 py-2"><Link href={`/admin/bookings/${b.id}`} className="font-mono font-semibold text-primary-700 underline">{b.code}</Link></td>
            <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(b.pickupAt)}</td>
            <td className="px-3 py-2">{b.customerName}<br /><span className="text-xs text-slate-500">{b.customerMobile}</span></td>
            <td className="px-3 py-2">{TRIP_TYPE_LABELS[b.tripType as keyof typeof TRIP_TYPE_LABELS] ?? b.tripType}<br /><span className="text-xs text-slate-500">{b.pickupLocation} → {b.dropLocation}</span></td>
            <td className="px-3 py-2">{b.category.name}<br /><span className="text-xs text-slate-500">{b.driver?.name ?? "—"}</span></td>
            <td className="px-3 py-2 whitespace-nowrap">{formatINR(b.finalFare ?? b.estimatedFare)}{b.finalFare !== null && <span className="block text-xs text-green-700">final</span>}</td>
            <td className="px-3 py-2"><StatusBadge status={b.status} /></td>
          </tr>
        ))}
      </Table>

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link className="btn-outline" href={`/admin/bookings?${filtersToQuery(filters, { page: String(page - 1) })}`}>← Previous</Link>}
            {page < pages && <Link className="btn-outline" href={`/admin/bookings?${filtersToQuery(filters, { page: String(page + 1) })}`}>Next →</Link>}
          </div>
        </nav>
      )}
    </>
  );
}
