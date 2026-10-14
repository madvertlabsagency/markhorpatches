import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";
import { renderEmail, type EmailTemplateName } from "@/lib/services/email/templates";
import { siteUrl } from "@/lib/env";

/** Staff-only preview of branded email templates with sample data. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) return new Response("Forbidden", { status: 403 });
  const name = (new URL(req.url).searchParams.get("t") ?? "proof_ready") as EmailTemplateName;
  const r = renderEmail(name, { firstName: "Alex", orderNumber: "PG-123456", requestNumber: "MR-654321", proofVersion: 2, totalCents: 46000, carrier: "UPS", trackingNumber: "1Z999AA10123456784", trackingUrl: "https://www.ups.com", url: siteUrl("/"), items: [{ name: "Embroidered Patches × 200", detail: '3" × 3" · Iron-On · $460.00' }], comment: "Make the border navy please.", summary: "Sample", mockup24h: false }, siteUrl());
  return new Response(r.html, { headers: { "Content-Type": "text/html; charset=utf-8", "X-Frame-Options": "SAMEORIGIN" } });
}
