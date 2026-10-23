import { NextResponse, type NextRequest } from "next/server";

/**
 * First-touch marketing attribution: when a visitor lands with UTM/click ids, remember them for
 * 30 days so the RFQ or seller application can be attributed. No PII is stored here.
 * (Authorization is NOT done here — every page and action checks the session server-side.)
 */
const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"];

export function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const params = req.nextUrl.searchParams;
  if (!req.cookies.get("pm_attr") && KEYS.some((k) => params.has(k))) {
    const data: Record<string, string> = {};
    for (const k of KEYS) {
      const v = params.get(k);
      if (v) data[k] = v.slice(0, 150);
    }
    data.landing_page = req.nextUrl.pathname.slice(0, 200);
    const ref = req.headers.get("referer");
    if (ref) data.referrer = ref.slice(0, 200);
    res.cookies.set("pm_attr", JSON.stringify(data), { maxAge: 30 * 86_400, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production", path: "/" });
  }
  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|brand|.*\\.(?:png|jpg|svg|webp|ico|txt|xml)$).*)"],
};
