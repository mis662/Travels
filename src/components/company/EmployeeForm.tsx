import type { Employee } from "@prisma/client";
import { saveEmployeeAction } from "@/actions/company";
import { ActionForm, Submit } from "@/components/admin/ActionForm";

function F({ label, name, hint, wide, children }: { label: string; name: string; hint?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label htmlFor={name} className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/** Company adds/edits an employee: details, home location (pickup point) and login for the employee app. */
export function EmployeeForm({ employee }: { employee?: Employee }) {
  const e = employee;
  const input = (name: keyof Employee & string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={name} name={name} defaultValue={e ? String(e[name] ?? "") : ""} className="input" {...props} />
  );
  return (
    <ActionForm action={saveEmployeeAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={e?.id ?? ""} />
      <F label="Full name" name="name">{input("name", { required: true, autoComplete: "off" })}</F>
      <F label="Employee ID / code" name="employeeCode">{input("employeeCode")}</F>
      <F label="Mobile number" name="mobile" hint="Used by the driver to call, and as the employee's login">{input("mobile", { type: "tel", inputMode: "numeric", required: true })}</F>
      <F label="Email" name="email">{input("email", { type: "email" })}</F>
      <F label="Gender" name="gender">
        <select id="gender" name="gender" defaultValue={e?.gender ?? ""} className="input">
          <option value="">—</option><option>Female</option><option>Male</option><option>Other</option>
        </select>
      </F>
      <F label="Department / shift" name="department">{input("department")}</F>

      <div className="mt-2 sm:col-span-2"><p className="font-semibold text-slate-800">Home location (pickup / drop point)</p></div>
      <F label="Home address" name="homeAddress" wide>
        <textarea id="homeAddress" name="homeAddress" rows={2} defaultValue={e?.homeAddress} className="input" required placeholder="Flat / building, street, area" />
      </F>
      <F label="Area / locality" name="homeArea" hint="Helps group nearby employees in one car">{input("homeArea", { placeholder: "e.g. Andheri West" })}</F>
      <F label="Landmark" name="homeLandmark">{input("homeLandmark", { placeholder: "Near…" })}</F>
      <F label="Google Maps link (optional)" name="homeMapLink" wide hint="Open Google Maps, long-press the home location, Share → copy link. Or paste “latitude,longitude”.">
        {input("homeMapLink", { placeholder: "https://maps.app.goo.gl/…" })}
      </F>

      <div className="mt-2 sm:col-span-2"><p className="font-semibold text-slate-800">Employee app login</p></div>
      <F label={e ? "New password (leave blank to keep)" : "Password"} name="password" hint="The employee signs in at /employee with mobile number + this password, and can change it">
        <input id="password" name="password" type="password" autoComplete="new-password" className="input" required={!e} />
      </F>
      <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="active" defaultChecked={e?.active ?? true} className="h-4 w-4" /> Active</label>
      <div className="sm:col-span-2"><Submit>{e ? "Save employee" : "Add employee"}</Submit></div>
    </ActionForm>
  );
}
