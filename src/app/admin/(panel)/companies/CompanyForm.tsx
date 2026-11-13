import type { Company } from "@prisma/client";
import { saveCompanyAction } from "@/actions/admin/corporate";
import { ActionForm, Submit } from "@/components/admin/ActionForm";

/** Super admin creates the company account: all details + the user ID and password the company signs in with. */
export function CompanyForm({ company, admins }: { company?: Company; admins: { id: string; name: string; role: string }[] }) {
  const c = company;
  const field = (name: keyof Company & string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} defaultValue={c ? String(c[name] ?? "") : ""} className="input" {...props} />
    </div>
  );
  return (
    <ActionForm action={saveCompanyAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={c?.id ?? ""} />
      {field("name", "Company name", { required: true })}
      {field("gstNumber", "GST number")}
      {field("contactName", "Contact person (HR / admin)")}
      {field("contactPhone", "Contact phone", { type: "tel" })}
      {field("contactEmail", "Contact email", { type: "email" })}
      <div>
        <label htmlFor="managerId" className="label">Default sub-admin (optional)</label>
        <select id="managerId" name="managerId" className="input" defaultValue={c?.managerId ?? ""}>
          <option value="">— Super admin assigns each booking —</option>
          {admins.map((a) => <option key={a.id} value={a.id}>{a.name}{a.role === "SUPER_ADMIN" ? " (super admin)" : ""}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="officeAddress" className="label">Office address</label>
        <textarea id="officeAddress" name="officeAddress" rows={2} defaultValue={c?.officeAddress} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="billingAddress" className="label">Billing address</label>
        <textarea id="billingAddress" name="billingAddress" rows={2} defaultValue={c?.billingAddress} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="notes" className="label">Notes (contract terms, rates, billing cycle…)</label>
        <textarea id="notes" name="notes" rows={2} defaultValue={c?.notes} className="input" />
      </div>

      <div className="mt-2 rounded-lg border border-primary-200 bg-primary-50 p-3 sm:col-span-2">
        <p className="mb-2 font-semibold text-primary-900">Company login</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("loginId", "User ID", { required: true, autoComplete: "off", placeholder: "e.g. acme or hr@acme.com" })}
          <div>
            <label htmlFor="password" className="label">{c ? "New password (leave blank to keep)" : "Password"}</label>
            <input id="password" name="password" type="text" autoComplete="off" className="input font-mono" placeholder={c ? "" : "min 8 characters"} required={!c} />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-600">
          Give the user ID and password to the company. They sign in at <strong>/company/login</strong> and must set their own password the first time.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={c?.active ?? true} className="h-4 w-4" /> Active (can sign in and book)</label>
      <div className="sm:col-span-2"><Submit>{c ? "Save company" : "Create company account"}</Submit></div>
    </ActionForm>
  );
}
