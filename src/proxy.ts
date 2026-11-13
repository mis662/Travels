import { NextResponse, type NextRequest } from "next/server";

// Fast gate: no session cookie → sign-in page. The session itself is verified
// against the database on every protected page and action.
const AREAS = [
  { prefix: "/admin", login: "/admin/login", cookie: "admin_session", open: ["/admin/login", "/admin/signup"] },
  { prefix: "/driver", login: "/driver/login", cookie: "driver_session", open: ["/driver/login", "/driver/signup"] },
  { prefix: "/account", login: "/account/login", cookie: "customer_session", open: ["/account/login", "/account/signup"] },
  { prefix: "/company", login: "/company/login", cookie: "company_session", open: ["/company/login"] },
  { prefix: "/employee", login: "/employee/login", cookie: "employee_session", open: ["/employee/login"] },
  // Customers browse freely; booking needs an account
  { prefix: "/book", login: "/account/login", cookie: "customer_session", open: [] },
];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const area = AREAS.find((a) => pathname === a.prefix || pathname.startsWith(`${a.prefix}/`));
  if (!area || area.open.includes(pathname)) return NextResponse.next();
  if (!req.cookies.get(area.cookie)) {
    const url = req.nextUrl.clone();
    url.pathname = area.login;
    // Send them back where they were going after signing in (e.g. the booking they started)
    const back = pathname + search;
    url.search = ["/admin", "/company", "/employee"].includes(area.prefix) || back === area.prefix ? "" : `?next=${encodeURIComponent(back)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/driver/:path*", "/account/:path*", "/company/:path*", "/employee/:path*", "/book"],
};
