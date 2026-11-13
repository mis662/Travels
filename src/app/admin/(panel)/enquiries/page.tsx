import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/session";
import { formatDateTime, telHref } from "@/lib/format";
import { waLink } from "@/lib/services/whatsapp";
import { toggleEnquiryAction } from "@/actions/admin/settings";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Enquiries" };

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireSuperAdmin();
  const { show } = await searchParams;
  const showAll = show === "all";
  const enquiries = await prisma.contactEnquiry.findMany({
    where: showAll ? {} : { resolved: false },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <PageTitle title="Contact enquiries">
        <Link href="/admin/enquiries" className={showAll ? "btn-outline" : "btn-primary"}>Open</Link>
        <Link href="/admin/enquiries?show=all" className={showAll ? "btn-primary" : "btn-outline"}>All</Link>
      </PageTitle>
      {enquiries.length === 0 && <p className="card p-6 text-center text-slate-500">No enquiries.</p>}
      <div className="space-y-3">
        {enquiries.map((e) => (
          <article key={e.id} className={`card p-4 ${e.resolved ? "opacity-70" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{e.name} {e.subject && <span className="font-normal text-slate-500">· {e.subject}</span>}</p>
                <p className="text-sm text-slate-600">
                  <a href={telHref(`+91${e.mobile}`)} className="underline">{e.mobile}</a>
                  {e.email && <> · <a href={`mailto:${e.email}`} className="underline">{e.email}</a></>}
                  {" · "}{formatDateTime(e.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <a href={waLink(`91${e.mobile}`, `Hello ${e.name}, thank you for contacting us.`)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp py-1.5 text-xs">WhatsApp</a>
                <ActionForm action={toggleEnquiryAction} className="">
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="resolved" value={String(!e.resolved)} />
                  <Submit className="btn-outline py-1.5 text-xs">{e.resolved ? "Reopen" : "Mark resolved"}</Submit>
                </ActionForm>
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{e.message}</p>
          </article>
        ))}
      </div>
    </>
  );
}
