import type { CarCategory, Driver, Route, Vehicle } from "@prisma/client";
import { istParts } from "@/lib/time";
import { ActionForm, Submit } from "./ActionForm";
import { saveDriverAction, saveVehicleAction } from "@/actions/admin/fleet";
import { saveCategoryAction, saveRouteAction } from "@/actions/admin/pricing";

const d = (date?: Date | null) => (date ? istParts(date).date : "");

function F({ label, name, children, className = "" }: { label: string; name: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">{label}</label>
      {children}
    </div>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4" /> {label}
    </label>
  );
}

export function DriverForm({ driver }: { driver?: Driver }) {
  return (
    <ActionForm action={saveDriverAction} className="grid gap-3 sm:grid-cols-2" resetOnSuccess={!driver}>
      <input type="hidden" name="id" value={driver?.id ?? ""} />
      <F label="Name" name="name"><input id="name" name="name" className="input" defaultValue={driver?.name} required /></F>
      <F label="Phone (10 digits)" name="phone"><input id="phone" name="phone" className="input" defaultValue={driver?.phone} inputMode="numeric" required /></F>
      <F label="Licence number" name="licenceNumber"><input id="licenceNumber" name="licenceNumber" className="input" defaultValue={driver?.licenceNumber} required /></F>
      <F label="Licence expiry" name="licenceExpiry"><input id="licenceExpiry" name="licenceExpiry" type="date" className="input" defaultValue={d(driver?.licenceExpiry)} required /></F>
      <F label="Police verification" name="policeVerification">
        <select id="policeVerification" name="policeVerification" className="input" defaultValue={driver?.policeVerification ?? "PENDING"}>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </F>
      <F label={driver?.pinHash ? "Driver app PIN (leave blank to keep current)" : "Driver app PIN (4–6 digits)"} name="pin">
        <input id="pin" name="pin" type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" className="input" placeholder={driver?.pinHash ? "••••" : "e.g. 4821"} />
      </F>
      <div className="flex items-end pb-2"><Check name="active" label="Active (available for assignment)" defaultChecked={driver?.active ?? true} /></div>
      <p className="text-xs text-slate-500 sm:col-span-2">
        With a PIN the driver can log in at <strong>/driver</strong> using their mobile number to see assigned trips and tap Start / Complete Ride.
        {driver?.pinHash && " Changing the PIN or deactivating the driver logs them out of the app."}
      </p>
      <div className="sm:col-span-2"><Submit>{driver ? "Save driver" : "Add driver"}</Submit></div>
    </ActionForm>
  );
}

export function VehicleForm({ vehicle, categories }: { vehicle?: Vehicle; categories: CarCategory[] }) {
  return (
    <ActionForm action={saveVehicleAction} className="grid gap-3 sm:grid-cols-2" resetOnSuccess={!vehicle}>
      <input type="hidden" name="id" value={vehicle?.id ?? ""} />
      <F label="Registration number" name="registrationNumber"><input id="registrationNumber" name="registrationNumber" className="input uppercase" defaultValue={vehicle?.registrationNumber} placeholder="MH02AB1234" required /></F>
      <F label="Model" name="model"><input id="model" name="model" className="input" defaultValue={vehicle?.model} placeholder="Maruti Dzire" required /></F>
      <F label="Car category" name="categoryId">
        <select id="categoryId" name="categoryId" className="input" defaultValue={vehicle?.categoryId ?? ""} required>
          <option value="" disabled>Select</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </F>
      <F label="Owner / vendor" name="ownerName"><input id="ownerName" name="ownerName" className="input" defaultValue={vehicle?.ownerName ?? "Own"} required /></F>
      <F label="Permit expiry" name="permitExpiry"><input id="permitExpiry" name="permitExpiry" type="date" className="input" defaultValue={d(vehicle?.permitExpiry)} required /></F>
      <F label="Insurance expiry" name="insuranceExpiry"><input id="insuranceExpiry" name="insuranceExpiry" type="date" className="input" defaultValue={d(vehicle?.insuranceExpiry)} required /></F>
      <Check name="active" label="Active" defaultChecked={vehicle?.active ?? true} />
      <div className="sm:col-span-2"><Submit>{vehicle ? "Save vehicle" : "Add vehicle"}</Submit></div>
    </ActionForm>
  );
}

export function CategoryForm({ category }: { category?: CarCategory }) {
  const c = category;
  return (
    <ActionForm action={saveCategoryAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <input type="hidden" name="id" value={c?.id ?? ""} />
      <F label="Name" name="name"><input id="name" name="name" className="input" defaultValue={c?.name} required /></F>
      <F label="URL slug (a-z, 0-9, -)" name="slug"><input id="slug" name="slug" className="input" defaultValue={c?.slug} pattern="[a-z0-9-]+" required /></F>
      <F label="Example models" name="exampleModels"><input id="exampleModels" name="exampleModels" className="input" defaultValue={c?.exampleModels} required /></F>
      <F label="Seats" name="seats"><input id="seats" name="seats" type="number" min={1} className="input" defaultValue={c?.seats ?? 4} /></F>
      <F label="Luggage (bags)" name="luggage"><input id="luggage" name="luggage" type="number" min={0} className="input" defaultValue={c?.luggage ?? 2} /></F>
      <F label="Sort order" name="sortOrder"><input id="sortOrder" name="sortOrder" type="number" min={0} className="input" defaultValue={c?.sortOrder ?? 10} /></F>
      <F label="Per km rate (₹, outstation)" name="perKmRate"><input id="perKmRate" name="perKmRate" type="number" min={0} step="0.5" className="input" defaultValue={c?.perKmRate} required /></F>
      <F label="Base / minimum outstation fare (₹)" name="baseFare"><input id="baseFare" name="baseFare" type="number" min={0} className="input" defaultValue={c?.baseFare} required /></F>
      <F label="Driver allowance per day (₹)" name="driverAllowancePerDay"><input id="driverAllowancePerDay" name="driverAllowancePerDay" type="number" min={0} className="input" defaultValue={c?.driverAllowancePerDay} required /></F>
      <F label="Local extra km rate (₹/km)" name="localExtraKmRate"><input id="localExtraKmRate" name="localExtraKmRate" type="number" min={0} step="0.5" className="input" defaultValue={c?.localExtraKmRate} required /></F>
      <F label="Local extra hour rate (₹/hr)" name="localExtraHourRate"><input id="localExtraHourRate" name="localExtraHourRate" type="number" min={0} className="input" defaultValue={c?.localExtraHourRate} required /></F>
      <F label="Image URL" name="imageUrl"><input id="imageUrl" name="imageUrl" className="input" defaultValue={c?.imageUrl ?? "/cars/sedan.svg"} placeholder="/cars/sedan.svg or https://…" /></F>
      <F label="Short description" name="description" className="sm:col-span-2 lg:col-span-3"><input id="description" name="description" className="input" defaultValue={c?.description} maxLength={300} /></F>
      <div className="flex gap-6 sm:col-span-2 lg:col-span-3">
        <Check name="ac" label="AC" defaultChecked={c?.ac ?? true} />
        <Check name="active" label="Active (shown to customers)" defaultChecked={c?.active ?? true} />
      </div>
      <div className="sm:col-span-2 lg:col-span-3"><Submit>{c ? "Save category" : "Create category"}</Submit></div>
    </ActionForm>
  );
}

export function RouteForm({ route }: { route?: Route }) {
  const r = route;
  return (
    <ActionForm action={saveRouteAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={r?.id ?? ""} />
      <F label="Destination city" name="toCity"><input id="toCity" name="toCity" className="input" defaultValue={r?.toCity} required /></F>
      <F label="URL slug (e.g. mumbai-to-pune)" name="slug"><input id="slug" name="slug" className="input" defaultValue={r?.slug} pattern="[a-z0-9-]+" required /></F>
      <F label="One-way distance from Mumbai (km)" name="distanceKm"><input id="distanceKm" name="distanceKm" type="number" min={1} className="input" defaultValue={r?.distanceKm} required /></F>
      <F label="Travel time (text)" name="durationText"><input id="durationText" name="durationText" className="input" defaultValue={r?.durationText} placeholder="3 – 3.5 hrs" /></F>
      <F label="SEO title" name="seoTitle" className="sm:col-span-2"><input id="seoTitle" name="seoTitle" className="input" defaultValue={r?.seoTitle} maxLength={120} /></F>
      <F label="SEO description" name="seoDescription" className="sm:col-span-2"><textarea id="seoDescription" name="seoDescription" className="input" rows={2} defaultValue={r?.seoDescription} maxLength={300} /></F>
      <F label="Page description" name="description" className="sm:col-span-2"><textarea id="description" name="description" className="input" rows={4} defaultValue={r?.description} maxLength={2000} /></F>
      <F label="Sort order" name="sortOrder"><input id="sortOrder" name="sortOrder" type="number" min={0} className="input" defaultValue={r?.sortOrder ?? 50} /></F>
      <div className="flex items-end gap-6 pb-2">
        <Check name="popular" label="Popular (home page)" defaultChecked={r?.popular ?? false} />
        <Check name="active" label="Active" defaultChecked={r?.active ?? true} />
      </div>
      <div className="sm:col-span-2"><Submit>{r ? "Save route" : "Create route"}</Submit></div>
    </ActionForm>
  );
}
