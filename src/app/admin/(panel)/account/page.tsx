import { requireAdmin } from "@/lib/auth/session";
import { changePasswordAction } from "@/actions/admin/auth";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { PageTitle, Panel } from "@/components/admin/ui";

export const metadata = { title: "My account" };

export default async function AdminAccountPage() {
  const admin = await requireAdmin();
  return (
    <>
      <PageTitle title="My account" />
      <Panel className="max-w-lg">
        <p className="text-sm text-slate-600">{admin.name} · {admin.email} · {admin.isSuper ? "Super admin" : "Sub-admin"}</p>
      </Panel>
      <Panel title="Change password" className="mt-6 max-w-lg">
        <ActionForm action={changePasswordAction} className="space-y-3" resetOnSuccess>
          <div><label htmlFor="current" className="label">Current password</label><input id="current" name="current" type="password" autoComplete="current-password" className="input" /></div>
          <div><label htmlFor="next" className="label">New password (min 8 characters)</label><input id="next" name="next" type="password" autoComplete="new-password" className="input" /></div>
          <div><label htmlFor="confirm" className="label">Confirm new password</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" className="input" /></div>
          <Submit>Change password</Submit>
        </ActionForm>
      </Panel>
    </>
  );
}
