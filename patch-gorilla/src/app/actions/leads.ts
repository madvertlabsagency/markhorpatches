"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { submitMockupRequest } from "@/lib/domain/mockups";
import { findOrderForTracking } from "@/lib/domain/orders";
import { ownerContext } from "@/lib/cart-session";
import { getUtm } from "@/lib/utm";
import { emit } from "@/lib/events";
import { orderAccessToken } from "@/lib/crypto";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

export type LeadState = { error?: string; fieldErrors?: Record<string, string>; success?: string } | undefined;

export async function submitMockupAction(_: LeadState, fd: FormData): Promise<LeadState> {
  if (fd.get("company_website")) return { success: "Thanks!" }; // honeypot
  const rl = rateLimit(`mockup:${await clientIp()}`, LIMITS.form.limit, LIMITS.form.windowMs);
  if (!rl.ok) return { error: "You've sent a few requests already — please wait a few minutes." };
  const raw = Object.fromEntries(fd.entries());
  let result;
  try {
    result = await submitMockupRequest({ ...raw, marketingConsent: fd.get("marketingConsent") === "on" }, { ...(await ownerContext()), utm: await getUtm() });
  } catch (e) {
    if (e instanceof z.ZodError) return { error: "Please check the highlighted fields.", fieldErrors: Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message])) };
    console.error("[mockup]", e);
    return { error: "We couldn't submit your request. Please try again — or email us your artwork directly." };
  }
  redirect(`/free-mockup/success?ref=${result.request.requestNumber}&o=${result.order.id}&t=${orderAccessToken(result.order.id)}`);
}

export async function trackOrderAction(_: LeadState, fd: FormData): Promise<LeadState> {
  const rl = rateLimit(`track:${await clientIp()}`, LIMITS.tracking.limit, LIMITS.tracking.windowMs);
  if (!rl.ok) return { error: "Too many lookups. Please wait a few minutes." };
  const orderNumber = String(fd.get("orderNumber") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  if (!orderNumber || !email) return { error: "Enter your order number and email." };
  const order = await findOrderForTracking(orderNumber, email);
  if (!order) return { error: "We couldn't find an order with that number and email. Check your confirmation email for the exact order number (e.g. PG-123456)." };
  redirect(`/order/${order.id}?t=${orderAccessToken(order.id)}`);
}

export async function supportAction(_: LeadState, fd: FormData): Promise<LeadState> {
  if (fd.get("company_website")) return { success: "Thanks!" };
  const rl = rateLimit(`support:${await clientIp()}`, LIMITS.form.limit, LIMITS.form.windowMs);
  if (!rl.ok) return { error: "Too many messages. Please wait a few minutes." };
  const parsed = z.object({
    name: z.string().trim().min(1, "Tell us your name").max(120), email: z.string().trim().toLowerCase().email("Enter a valid email"),
    phone: z.string().trim().max(30).optional(), topic: z.string().trim().max(60), orderNumber: z.string().trim().max(20).optional(), message: z.string().trim().min(5, "Tell us a bit more").max(4000),
  }).safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: "Please check the highlighted fields.", fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const d = parsed.data;
  const [firstName, ...rest] = d.name.split(" ");
  const lead = await prisma.lead.create({ data: { email: d.email, firstName, lastName: rest.join(" ") || null, phone: d.phone || null, source: "SUPPORT", utm: (await getUtm()) ?? undefined, payload: { topic: d.topic, orderNumber: d.orderNumber, message: d.message } } });
  await emit({ type: "support.requested", leadId: lead.id });
  return { success: "Message received. A real human will reply within one business day." };
}
