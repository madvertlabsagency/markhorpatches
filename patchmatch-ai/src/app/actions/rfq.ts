"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, membershipOf } from "@/lib/auth/session";
import { createRfq } from "@/lib/domain/rfq";
import { guestOwnerHash } from "@/lib/files";
import { clientIp, userAgent } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { rfqSubmissionSchema, WIZARD_STEPS } from "@/lib/rfq/schema";
import { siteUrl, isDemoMode } from "@/lib/env";
import { toActionError } from "@/lib/actions";
import { runAITask } from "@/lib/services/ai";
import { conciergeTask } from "@/lib/ai/tasks";
import { trackEvent } from "@/lib/analytics/events";
import { ensureBuyerOrg } from "@/lib/domain/orgs";

export type SubmitResult = { ok: true; ref: string; rfqId: string; trackUrl: string; verified: boolean } | { ok: false; error: string; step?: number; fieldErrors?: Record<string, string> };

export async function submitRfqAction(payload: unknown): Promise<SubmitResult> {
  const ip = await clientIp();
  const rl = rateLimit(`rfq-submit:${ip}`, 6, 60 * 60_000);
  if (!rl.ok) return { ok: false, error: "You've submitted several requests recently. Please wait before sending another, or contact us." };
  const parsed = rfqSubmissionSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? "form")] = i.message;
    const firstField = String(parsed.error.issues[0]?.path[0] ?? "");
    const step = WIZARD_STEPS.findIndex((s) => Object.keys((s.schema as unknown as { shape?: Record<string, unknown> }).shape ?? {}).includes(firstField));
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your request.", step: step >= 0 ? step : undefined, fieldErrors };
  }
  try {
    const user = await getCurrentUser();
    const sameEmail = !!user && user.email === parsed.data.contactEmail;
    let buyerOrgId: string | null = null;
    if (user && sameEmail) buyerOrgId = membershipOf(user, "BUYER")?.orgId ?? (await ensureBuyerOrg(user.id)).id;
    const jar = await cookies();
    let attribution: Record<string, string> = {};
    try {
      attribution = JSON.parse(jar.get("pm_attr")?.value ?? "{}");
    } catch {}
    const { rfq, guestToken } = await createRfq(parsed.data, {
      userId: sameEmail ? user!.id : null,
      userEmailVerified: sameEmail && !!user!.emailVerifiedAt,
      buyerOrgId,
      guestOwnerHash: await guestOwnerHash(),
      ip,
      userAgent: await userAgent(),
      attribution,
      isDemo: isDemoMode(),
    });
    // Remember guest access on this device so the tracking page works without the email link.
    jar.set(`pm_rfq_${rfq.publicRef}`, guestToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 90 * 86_400, path: "/" });
    return { ok: true, ref: rfq.publicRef, rfqId: rfq.id, trackUrl: siteUrl(`/rfq/track/${rfq.publicRef}?t=${guestToken}`), verified: !!rfq.emailVerifiedAt };
  } catch (e) {
    const r = toActionError(e);
    return { ok: false, error: r && !r.ok ? r.error : "Something went wrong." };
  }
}

export async function trackRfqStartedAction(patchType: string) {
  await trackEvent("RFQStarted", { props: { patchType: String(patchType).slice(0, 20) }, isDemo: isDemoMode() });
}

export async function askConciergeAction(question: string): Promise<{ ok: true; answer: string; recommended: string } | { ok: false; error: string }> {
  const q = z.string().trim().min(3).max(600).safeParse(question);
  if (!q.success) return { ok: false, error: "Ask a question between 3 and 600 characters." };
  const ip = await clientIp();
  if (!rateLimit(`concierge:${ip}`, 15, 10 * 60_000).ok) return { ok: false, error: "You've asked a lot of questions — please wait a few minutes." };
  const r = await runAITask(conciergeTask, { question: q.data }, { entityType: "Concierge" });
  return { ok: true, answer: r.output.answer, recommended: r.output.recommendedPatchType };
}

/** Prefill helper for signed-in buyers. */
export async function wizardPrefill() {
  const user = await getCurrentUser();
  if (!user) return null;
  const buyer = membershipOf(user, "BUYER");
  const profile = buyer ? await prisma.buyerProfile.findUnique({ where: { orgId: buyer.orgId } }) : null;
  return { contactName: user.name ?? "", contactEmail: user.email, contactPhone: user.phone ?? profile?.phone ?? "", contactCompany: profile?.companyName ?? "" };
}
