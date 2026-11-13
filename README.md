# [Your Brand Name] — Mumbai Car Booking Website

A complete taxi / tours & travels booking website for Mumbai with a customer booking flow and an admin panel.

- **Customers:** get an instant fare estimate for Airport, Local (hourly) and Outstation (one way / round trip) trips, pick a car, and submit a booking request. **No online payment** — they pay the driver or your office after the trip. They can track or cancel their booking with Booking ID + mobile number.
- **Admin (`/admin`):** dashboard, bookings (search, filters, CSV export, status changes, driver/vehicle assignment, final fare, notes, cancellation), drivers, vehicles (document expiry alerts), car categories & all pricing, outstation routes, contact enquiries and business settings.

Tech: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 6 + SQLite (PostgreSQL-ready) · Zod · bcrypt + HTTP-only session cookies · Nodemailer · Vitest.

---

## 1. Requirements

- **Node.js 20.9 or newer** (22 LTS recommended) — download the LTS installer from <https://nodejs.org>.
  Check with `node -v` in a new VS Code terminal.
- VS Code (or any editor). No paid services or API keys are needed.

## 2. First-time setup

Open the project folder in VS Code, then open a terminal (**Terminal → New Terminal**) and run:

```bash
# 1. Install packages
npm install

# 2. Create your .env file
#    Windows (PowerShell):  Copy-Item .env.example .env
#    macOS / Linux:         cp .env.example .env
#    Then open .env and set ADMIN_EMAIL / ADMIN_PASSWORD.

# 3. Create the database (prisma/dev.db) and apply migrations
npm run db:migrate

# 4. Load sample data: cars, prices, airports & zones, routes, demo driver/vehicle, settings, admin user
npm run db:seed

# 5. Start the site
npm run dev
```

Open <http://localhost:3000>. The admin panel is at <http://localhost:3000/admin>.

> `npm run db:migrate` may run the seed automatically the first time — running `npm run db:seed` again is safe; it never duplicates data or overwrites prices you have edited.

### Sign in & sign up

| Who | Sign in | Sign up |
| --- | --- | --- |
| **Customers** | `/account/login` (mobile or email + password) | `/account/signup`. Browsing, fares and Track Booking need no account — signing in is asked only when they continue to **Booking Details**, and they return to their booking afterwards. **My bookings** at `/account`. |
| **Admins** | `/admin/login` | `/admin/signup` — requires the secret **invite code** from `ADMIN_SIGNUP_CODE` in `.env`. Leave it empty to turn admin sign-up off. Share the code only with people who should be admins, and change it if it leaks. |
| **Drivers** | `/driver/login` (mobile + PIN) | `/driver/signup` — the account waits for approval. Admin approves or rejects it under **Admin → Drivers** (the sidebar shows a badge). Admins can still add drivers and set PINs directly. |

### Admin login

Use the `ADMIN_EMAIL` and `ADMIN_PASSWORD` from your `.env` (defaults: `admin@yourdomain.com` / `ChangeMe@123`).
**Change the password after first login** in **Admin → Settings → Change password**.

The seed only creates the admin if that email doesn't exist yet. To add another admin, change `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `.env` and run `npm run db:seed` again.

## 3. Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server on port 3000 |
| `npm test` | Run unit tests (fare engine, booking validation, statuses) |
| `npm run typecheck` | TypeScript check |
| `npm run build` / `npm start` | Production build / run the production build |
| `npm run db:migrate` | Apply schema changes (creates a new migration if `schema.prisma` changed) |
| `npm run db:seed` | Load / top-up sample data (safe to re-run) |
| `npm run db:studio` | Browse and edit the database in your browser (Prisma Studio) |
| `npm run db:reset` | **Deletes all data**, re-creates the database and re-seeds |
| `npm run smoke` | End-to-end check of the booking service against your local DB (creates and deletes test bookings) |

## 4. Changing prices

Everything is editable in **Admin → Cars & Pricing** — no code changes needed:

| What | Where |
| --- | --- |
| Per-km rate, minimum outstation fare, driver allowance/day, local extra km & extra hour rates, seats, luggage, AC, image, active | **Car categories → Edit** |
| Local package prices (4hr/40km, 8hr/80km, 12hr/120km) and the packages themselves | **Local packages** grid |
| Airport fares per car × zone, per airport (CSMIA T1, T2, Navi Mumbai) and the zones | **Airport fares** grid |
| Night charge (amount + hours), GST %, round-trip minimum km/day, one-way minimum km | **Charges & GST** |
| Outstation destinations and distances | **Admin → Routes** |
| Minimum advance booking hours, online-cancellation cut-off | **Admin → Settings** |

**How fares are calculated** (server-side, in `src/lib/fare/engine.ts`):

- **Airport:** fixed fare for the car category and zone.
- **Local:** package price. Extra km / extra hours are shown and charged after the trip.
- **Outstation one way:** `max(route km, one-way minimum km) × per-km rate`.
- **Outstation round trip:** `max(route km × 2, 250 km × days) × per-km rate + driver allowance × days`.
- Outstation fares never go below the category's **minimum fare** (base fare).
- **Night charge** added when pickup is between 10 PM and 6 AM (configurable).
- **GST** added on the subtotal and shown separately.
- Toll, parking and state tax are always shown as **"extra as actual"**.

Each booking stores a snapshot of its fare breakdown, so changing prices never changes existing bookings. Admin can set a **final fare** on any booking.

## 5. Branding & content

- **Business name, phones, WhatsApp, email, address:** Admin → Settings (stored in the database).
- **Colours:** `src/app/theme.css` — change the `primary` (deep blue) and `accent` (yellow) scales.
- **Brand defaults, tagline, booking-ID prefix (`MUM`), payment note:** `src/config/site.ts`.
- **Car images:** placeholder illustrations are in `public/cars/`. Put real photos in that folder (e.g. `public/cars/innova.jpg`) and set the category's image to `/cars/innova.jpg` in admin.
- **Service pages text:** `src/config/services.ts`. **Home page sections & testimonials:** `src/app/(site)/page.tsx`.
- **About / Terms / Cancellation / Privacy:** edit the files in `src/app/(site)/about`, `terms`, `cancellation-policy`, `privacy-policy` (placeholder text — review before going live).

## 6. Email notifications

Admin and customer (if they entered an email) get emails on new bookings and every status change; admins also get contact-form enquiries.

If `SMTP_HOST` is empty, emails are **printed to the terminal** instead — nothing fails. To send real emails, fill in `.env`, for example with Gmail (create an *App password* in your Google account):

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="you@gmail.com"
SMTP_PASS="your-16-char-app-password"
MAIL_FROM="Bookings <you@gmail.com>"
ADMIN_NOTIFY_EMAIL="you@gmail.com"
```

WhatsApp uses free `wa.me` click-to-chat links (customer → business on the confirmation page; admin → customer on the booking detail page). No WhatsApp API is needed.

## 7. Booking flow & rules

Home widget → **Select Car** (`/select-car`) → **Booking Details** (`/book`) → **Confirmation** (`/booking/MUM-YYYYMMDD-XXXX`) → **Track / Manage** (`/track`).

- Pickup can't be in the past and must be ≥ 2 hours ahead (configurable). Round-trip return date can't be before the pickup date (same-day return allowed for day trips).
- Passengers can't exceed the car's seats. Mobile must be a valid 10-digit Indian number.
- All rules run in the browser **and again on the server** (shared Zod schemas in `src/lib/validation`).
- Duplicate submissions are blocked: the button disables on submit, each form has a one-time key, and an identical booking (same mobile, car, pickup time) within 10 minutes returns the existing booking.
- Statuses: **Pending → Confirmed → Driver Assigned → Ongoing → Completed**, or **Cancelled** (by customer or admin). Every change is stored in the status history with time and who made it.
- Customers can cancel online until 6 hours before pickup (configurable). Driver & vehicle details appear on the Track page once assigned.

### Driver app (`/driver`)

Drivers use a mobile-friendly page — no app install needed.

1. **Admin → Drivers → Edit** a driver and set a **Driver app PIN** (4–6 digits). The demo driver is mobile `9876543210`, PIN `1234`.
2. The driver opens `https://yourdomain.com/driver` on their phone and logs in with their mobile number + PIN (stays logged in for 30 days).
3. They see all trips assigned to them, with passenger name, call/WhatsApp buttons, Google Maps navigation for pickup and drop, and the fare to collect.
4. **Start Ride** → booking becomes **Ongoing** (start time recorded). **Complete Ride** → **Completed** (end time recorded). The customer and admin get the usual status emails.
5. The customer's Track page refreshes every 30 seconds while the trip is active, so they see "Your ride is in progress" without reloading.

On the admin booking page, **Send trip to driver on WhatsApp** sends the trip details with a direct link to that trip in the driver app. Drivers can only see their own trips; changing a driver's PIN or deactivating them logs them out everywhere. Admin can still change any status manually.

### Corporate accounts (B2B)

Companies that hire cars for their employees get their **own dashboard** at `/company` (separate from `/account`, which is for normal website customers).

| Who | Where | What they do |
| --- | --- | --- |
| **Super admin** | `/admin` → **Companies** | Creates the company account with all details **and its user ID + password**, and gives them to the company. Gets every new booking on the dashboard and **assigns it to a sub-admin** (or sets a default sub-admin per company). Can set the agreed rate. |
| **Company** | `/company/login` | Signs in with the user ID/password and must set its own password the first time. Adds **employees** with mobile, gender, department and **home location** (address, area, landmark, Google Maps link) and gives each a login. Adds **its own routes** (e.g. "Employees' homes → BKC office"). Sees **Fleet** (car types + seats) and **Routes**. **Books cars**: Airport / Local / Outstation / Own route; single trip, day-wise or monthly (optionally no Sundays); **several cars per booking**, choosing the car type for each (4-seater, 6/7-seater…) and **which employees ride together** (limited to the seats). Sees the assigned driver per car. |
| **Sub-admin** | `/admin` | Sees only the bookings assigned to them. **Creates driver accounts** (and vehicles). Opens a booking, sees every car with the employees' names, mobiles and home locations, and **assigns a driver (+ vehicle) per car**; one duty per day is created. Can change the driver later (moves upcoming duties). |
| **Driver** | `/driver` | Sees each duty with every employee in pickup order: name, gender, home address, landmark, Map / Call / WhatsApp buttons. Taps Start / Complete. No cash to collect. |
| **Employee** | `/employee/login` | Signs in with mobile + password from the company. Sees upcoming rides with the **driver's name, phone and car number**, and who they ride with. Can change their password. |

Rules: one employee can't be in two cars of the same booking; a car can't carry more employees than its seats; the same driver/vehicle can't be double-booked within 4 hours; cancelling a booking cancels duties that haven't started. A company can cancel its own booking until a driver is assigned.

## 8. Adding online payment later

Phase 1 deliberately has no payment gateway. The code is prepared for one:

- `Booking` already has `paymentStatus` (`UNPAID`/`PAID`/`REFUNDED`), `paymentMethod` and `paymentRef`.
- All booking writes go through `src/lib/services/booking.ts`. A gateway (Razorpay, Cashfree, PhonePe…) would add a `payment.ts` service that creates an order for `booking.estimatedFare`, a "Pay now" button on the confirmation/track page, and a webhook route (`src/app/api/payments/webhook/route.ts`) that verifies the signature and updates `paymentStatus` / `paymentRef` (optionally moving the booking to `CONFIRMED` via `changeStatusByAdmin`). The booking form and fare engine don't need to change.

## 9. Switching to PostgreSQL

1. Create a PostgreSQL database (local, Neon, Supabase, Vercel Postgres, Railway…).
2. In `prisma/schema.prisma` change `provider = "sqlite"` to `provider = "postgresql"` (Prisma requires the provider to be set in the schema — this is the only code change).
3. Set `DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public"` in `.env`.
4. The migrations in `prisma/migrations` were generated for SQLite. Delete that folder and create a fresh baseline for PostgreSQL:
   ```bash
   npx prisma migrate dev --name init
   npm run db:seed
   ```

## 10. Deploying

### Option A — Vercel + PostgreSQL (easiest)

SQLite does not work on Vercel (the file system is read-only), so use PostgreSQL:

1. Do the **Switching to PostgreSQL** steps above and commit the new `prisma/migrations` folder.
2. Push the project to GitHub and import it in Vercel.
3. In Vercel → Settings → Environment Variables add: `DATABASE_URL`, `APP_URL` (e.g. `https://www.yourdomain.com`), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and the `SMTP_*` / `MAIL_FROM` / `ADMIN_NOTIFY_EMAIL` values.
4. Set **Build Command** to `npm run vercel-build` (runs migrations, then builds).
5. After the first deploy, seed once from your computer with the production `DATABASE_URL` in your `.env`: `npm run db:seed`.
6. Add your domain in Vercel → Domains.

### Option B — VPS (DigitalOcean, Hostinger, AWS Lightsail…)

On an Ubuntu server with Node 20+ installed:

```bash
git clone <your-repo> cabs && cd cabs
npm ci
cp .env.example .env        # set APP_URL, admin and SMTP values; SQLite works fine on a single VPS
npm run db:deploy           # apply migrations
npm run db:seed
npm run build
npm install -g pm2
pm2 start npm --name cabs -- start
pm2 save && pm2 startup
```

Put **Nginx** in front (`proxy_pass http://127.0.0.1:3000;`) and get a free HTTPS certificate with `certbot --nginx`. If you stay on SQLite, back up `prisma/dev.db` regularly (or point `DATABASE_URL` at PostgreSQL).

> Login / tracking rate-limits are kept in memory. That is fine for one server; for several instances use a shared store (e.g. Redis).

## 11. SEO

- Per-page titles, descriptions and Open Graph tags; a generated social image (`/opengraph-image`).
- `sitemap.xml` (includes every active route page) and `robots.txt` — set `APP_URL` to your real domain in production.
- LocalBusiness / TaxiService JSON-LD on every page, FAQ and Breadcrumb schema on route/service pages.
- Route landing pages are generated from the database at `/routes/<slug>` (e.g. `/routes/mumbai-to-pune`). Add a route in admin and its page, sitemap entry and booking option appear automatically.

## 12. Project structure

```
prisma/              schema.prisma, migrations/, seed.ts
public/cars/         car images
scripts/             smoke-booking.ts (service-level end-to-end check)
src/
  app/
    (site)/          public pages: home, select-car, book, booking/[code], track, fleet,
                     services/[slug], routes, routes/[slug], about, contact, legal pages
    admin/(auth)/    login
    admin/(panel)/   dashboard, bookings (+ CSV export), drivers, vehicles, pricing, routes, enquiries, settings
    sitemap.ts, robots.ts, opengraph-image.tsx, theme.css, globals.css
  actions/           server actions (booking, track, contact, admin/*)
  components/        ui/, site/, booking/, admin/
  config/            site.ts (brand), services.ts (service page content)
  lib/
    fare/engine.ts   pure fare calculation (unit tested)
    booking/         status rules, booking rules, booking code
    validation/      Zod schemas shared by browser and server
    services/        booking, pricing, settings, notifications, whatsapp
    auth/session.ts  admin login sessions (bcrypt + HTTP-only cookie)
  proxy.ts           redirects /admin to login when there is no session cookie
tests/               Vitest unit tests
```

## 13. Troubleshooting

- **`node` is not recognised** — install Node.js LTS and open a *new* terminal.
- **`The table … does not exist`** — run `npm run db:migrate` then `npm run db:seed`.
- **Can't log in** — check `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `.env` were set *before* the first seed. To start completely fresh: `npm run db:reset` (deletes all data).
- **Port 3000 busy** — `npm run dev -- -p 3001`.
- **Prices didn't change after re-seeding** — by design; the seed never overwrites prices. Edit them in admin.
- `npm audit` reports `deepmerge-ts` via the Prisma CLI: it affects the dev-time CLI only (not the website); the fix requires the Prisma 7 major upgrade.
