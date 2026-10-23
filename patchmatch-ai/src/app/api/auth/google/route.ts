import { NextResponse } from "next/server";
import { randomToken, signPayload } from "@/lib/crypto";
import { siteUrl } from "@/lib/env";

/** Google OAuth 2.0 (authorization code) — enabled only when GOOGLE_CLIENT_ID/SECRET are configured. */
export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) return NextResponse.redirect(siteUrl("/login?error=google"));
  const next = new URL(req.url).searchParams.get("next") ?? "";
  const nonce = randomToken(16);
  const state = signPayload({ nonce, next }, 600);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId, redirect_uri: siteUrl("/api/auth/google/callback"), response_type: "code", scope: "openid email profile", state, prompt: "select_account",
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set("pm_oauth_nonce", nonce, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/api/auth/google" });
  return res;
}
