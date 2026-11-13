import { prisma } from "@/lib/db";
import { requireCompany } from "@/lib/auth/company-session";
import { getSettings } from "@/lib/services/settings";
import { companyChangePasswordAction } from "@/actions/company";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { PageTitle, Panel } from "@/components/admin/ui";

export const metadata = { title: "Account" };

export default async function CompanyAccountPage() {
  const me = await requireCompany();
  const [c, s] = await Promise.all([prisma.company.findUniqueOrThrow({ where: { id: me.id } }), getSettings()]);
  const rows: [string, string][] = [
    ["Company", c.name],
    ["User ID", c.loginId ?? ""],
    ["Contact", [c.contactName, c.contactPhone, c.contactEmail].filter(Boolean).join(" · ")],
    ["GST", c.gstNumber],
    ["Office", c.officeAddress],
    ["Billing address", c.billingAddress],
  ];
  return (
    <>
      <PageTitle title="Account" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Company details">
          <dl className="space-y-2 text-sm">
            {rows.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[130px_1fr] gap-2"><dt className="text-slate-500">{k}</dt><dd className="font-medium whitespace-pre-wrap">{v}</dd></div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-slate-500">To change these details, contact {s.businessName} on {s.phonePrimary}.</p>
        </Panel>
        <Panel title="Change password">
          <ActionForm action={companyChangePasswordAction} className="space-y-3" resetOnSuccess>
            <div><label htmlFor="current" className="label">Current password</label><input id="current" name="current" type="password" autoComplete="current-password" className="input" /></div>
            <div><label htmlFor="next" className="label">New password (min 8 characters)</label><input id="next" name="next" type="password" autoComplete="new-password" className="input" /></div>
            <div><label htmlFor="confirm" className="label">Confirm new password</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" className="input" /></div>
            <Submit>Change password</Submit>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
