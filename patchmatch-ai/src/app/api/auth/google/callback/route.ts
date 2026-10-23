import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyPayload } from "@/lib/crypto";
import { siteUrl } from "@/lib/env";
import { createSession } from "@/lib/auth/session";
import { ensureBuyerOrg } from "@/lib/domain/orgs";
import { audit } from "@/lib/audit";
import { clientIp, userAgent } from "@/lib/request";
import { isStaff } from "@/lib/auth/rbac";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const fail = () => NextResponse.redirect(siteUrl("/login?error=google"));
  const state = verifyPayload<{ nonce: string; next: string }>(params.get("state"));
  const jar = await cookies();
  if (!state || state.nonce !== jar.get("pm_oauth_nonce")?.value || !params.get("code")) return fail();
  jar.delete("pm_oauth_nonce");
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code: params.get("code")!, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: siteUrl("/api/auth/google/callback"), grant_type: "authorization_code" }),
    });
    if (!tokenRes.ok) return fail();
    const { access_token } = (await tokenRes.json()) as { access_token?: string };
    const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${access_token}` } });
    if (!infoRes.ok) return fail();
    const info = (await infoRes.json()) as { sub: string; email?: string; email_verified?: boolean; name?: string };
    if (!info.email || !info.email_verified) return fail();
    const email = info.email.toLowerCase();
    let user = await prisma.user.findFirst({ where: { OR: [{ googleSub: info.sub }, { email }] } });
    if (user?.disabledAt) return fail();
    if (user && isStaff(user.platformRole)) return fail(); // staff must use password + MFA
    if (!user) {
      user = await prisma.user.create({ data: { email, name: info.name, googleSub: info.sub, emailVerifiedAt: new Date() } });
      await ensureBuyerOrg(user.id);
    } else if (!user.googleSub) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleSub: info.sub, emailVerifiedAt: user.emailVerifiedAt ?? new Date() } });
    }
    await createSession(user.id, { ip: await clientIp(), userAgent: await userAgent() });
    await audit(user.id, "auth.login_google", "User", user.id);
    const next = state.next?.startsWith("/") && !state.next.startsWith("//") ? state.next : "/buyer/dashboard";
    return NextResponse.redirect(siteUrl(next));
  } catch {
    return fail();
  }
}
