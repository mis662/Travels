import { prisma } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/employee-session";
import { employeeChangePasswordAction } from "@/actions/employee";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { Panel } from "@/components/admin/ui";

export const metadata = { title: "Account" };

export default async function EmployeeAccountPage() {
  const me = await requireEmployee();
  const e = await prisma.employee.findUniqueOrThrow({ where: { id: me.id } });
  return (
    <div className="space-y-5">
      <Panel title="My details">
        <dl className="space-y-1 text-sm">
          <p><span className="text-slate-500">Name:</span> {e.name}{e.employeeCode && ` (${e.employeeCode})`}</p>
          <p><span className="text-slate-500">Mobile:</span> {e.mobile}</p>
          <p><span className="text-slate-500">Pickup location:</span> {e.homeAddress}{e.homeArea && `, ${e.homeArea}`}{e.homeLandmark && ` · near ${e.homeLandmark}`}</p>
        </dl>
        <p className="mt-3 text-xs text-slate-500">To change your pickup location, ask your company admin.</p>
      </Panel>
      <Panel title="Change password">
        <ActionForm action={employeeChangePasswordAction} className="space-y-3" resetOnSuccess>
          <div><label htmlFor="current" className="label">Current password</label><input id="current" name="current" type="password" autoComplete="current-password" className="input" /></div>
          <div><label htmlFor="next" className="label">New password (min 8 characters)</label><input id="next" name="next" type="password" autoComplete="new-password" className="input" /></div>
          <div><label htmlFor="confirm" className="label">Confirm new password</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" className="input" /></div>
          <Submit>Change password</Submit>
        </ActionForm>
      </Panel>
    </div>
  );
}
