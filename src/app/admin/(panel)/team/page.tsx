import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/session";
import { saveTeamMemberAction } from "@/actions/admin/corporate";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { PageTitle, Panel } from "@/components/admin/ui";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const me = await requireSuperAdmin();
  const admins = await prisma.adminUser.findMany({
    orderBy: [{ role: "desc" }, { name: "asc" }],
    include: { _count: { select: { managedCompanies: true, managedOrders: { where: { status: { in: ["NEW", "IN_PROGRESS"] } } } } } },
  });
  const inviteOn = Boolean(process.env.ADMIN_SIGNUP_CODE?.trim());
  return (
    <>
      <PageTitle title="Team: super admin & sub-admins" />
      <Panel className="mb-6">
        <p className="text-sm text-slate-700">
          <strong>Adding a sub-admin:</strong> share the admin sign-up link <code>/admin/signup</code> and the invite code from <code>ADMIN_SIGNUP_CODE</code> in your <code>.env</code>
          {inviteOn ? "" : " (currently empty — admin sign-up is OFF)"}. New sign-ups join as <strong>sub-admins</strong>. Then assign them companies under <strong>Companies</strong>.
          Sub-admins only see the corporate orders and duties of the companies they handle.
        </p>
      </Panel>
      <div className="space-y-3">
        {admins.map((a) => (
          <ActionForm key={a.id} action={saveTeamMemberAction} className="card flex flex-wrap items-center gap-4 p-4">
            <input type="hidden" name="id" value={a.id} />
            <div className="min-w-56 flex-1">
              <p className="font-semibold">{a.name}{a.id === me.id && <span className="ml-2 text-xs text-slate-500">(you)</span>}</p>
              <p className="text-sm text-slate-500">{a.email} · {a._count.managedCompanies} compan{a._count.managedCompanies === 1 ? "y" : "ies"} · {a._count.managedOrders} open orders</p>
            </div>
            <select name="role" defaultValue={a.role} className="input w-44" aria-label={`Role of ${a.name}`}>
              <option value="SUB_ADMIN">Sub-admin</option>
              <option value="SUPER_ADMIN">Super admin</option>
            </select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={a.active} className="h-4 w-4" /> Active</label>
            <Submit className="btn-outline">Save</Submit>
          </ActionForm>
        ))}
      </div>
    </>
  );
}
