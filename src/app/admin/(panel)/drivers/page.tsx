import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { DriverForm } from "@/components/admin/forms";
import { ExpiryDate, PageTitle, Panel, Table } from "@/components/admin/ui";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { reviewDriverSignupAction } from "@/actions/admin/fleet";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Drivers" };

export default async function DriversPage() {
  await requireAdmin();
  const [drivers, pending] = await Promise.all([
    prisma.driver.findMany({
      where: { approved: true },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: { _count: { select: { bookings: true } } },
    }),
    prisma.driver.findMany({ where: { approved: false }, orderBy: { createdAt: "asc" } }),
  ]);
  return (
    <>
      <PageTitle title="Drivers" />
      {pending.length > 0 && (
        <Panel title={`New driver sign-ups waiting for approval (${pending.length})`} className="mb-6 border-amber-300 bg-amber-50">
          <p className="mb-3 text-sm text-amber-900">Check the driving licence and do police verification before approving. Approved drivers can sign in to the driver app.</p>
          <ul className="space-y-3">
            {pending.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-3 text-sm shadow-sm">
                <div>
                  <p className="font-semibold">{d.name} · {d.phone}</p>
                  <p className="text-slate-600">Licence <span className="font-mono">{d.licenceNumber}</span>, valid till <ExpiryDate date={d.licenceExpiry} /> · signed up {formatDateTime(d.createdAt)}</p>
                </div>
                <ActionForm action={reviewDriverSignupAction} className="flex gap-2" confirm="Are you sure?">
                  <input type="hidden" name="id" value={d.id} />
                  <Submit name="decision" value="approve" className="btn bg-green-600 py-1.5 text-white hover:bg-green-700">Approve</Submit>
                  <Submit name="decision" value="reject" className="btn-outline py-1.5 text-red-700">Reject</Submit>
                </ActionForm>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <Table head={["Name", "Phone", "Licence", "Licence expiry", "Police verification", "Trips", "Driver app", "Status", ""]} empty={drivers.length === 0}>
        {drivers.map((d) => (
          <tr key={d.id} className={d.active ? "" : "opacity-60"}>
            <td className="px-3 py-2 font-medium">{d.name}</td>
            <td className="px-3 py-2">{d.phone}</td>
            <td className="px-3 py-2 font-mono text-xs">{d.licenceNumber}</td>
            <td className="px-3 py-2"><ExpiryDate date={d.licenceExpiry} /></td>
            <td className="px-3 py-2">
              <span className={d.policeVerification === "VERIFIED" ? "text-green-700" : d.policeVerification === "REJECTED" ? "text-red-700" : "text-amber-700"}>
                {d.policeVerification.toLowerCase()}
              </span>
            </td>
            <td className="px-3 py-2">{d._count.bookings}</td>
            <td className="px-3 py-2">{d.pinHash ? <span className="text-green-700">PIN set</span> : <span className="text-slate-400">No PIN</span>}</td>
            <td className="px-3 py-2">{d.active ? "Active" : "Inactive"}</td>
            <td className="px-3 py-2"><Link href={`/admin/drivers/${d.id}`} className="text-primary-700 underline">Edit</Link></td>
          </tr>
        ))}
      </Table>
      <Panel title="Add driver" className="mt-6"><DriverForm /></Panel>
    </>
  );
}
