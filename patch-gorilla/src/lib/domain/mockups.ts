import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCatalogFresh } from "@/lib/catalog";
import { priceLine } from "@/lib/pricing/engine";
import { emit } from "@/lib/events";
import { upsertCustomer } from "./orders";
import { withUniqueRef } from "./numbers";
import { describeConfiguration, configurationInclude } from "./configurations";

export const mockupInput = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  artworkFileId: z.string().optional().or(z.literal("")),
  patchTypeId: z.string().optional().or(z.literal("")),
  approxSize: z.string().trim().max(40).optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1).max(1_000_000).optional().or(z.literal("").transform(() => undefined)),
  deadline: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(3000).optional().or(z.literal("")),
  marketingConsent: z.coerce.boolean().optional(),
});

export type MockupInput = z.infer<typeof mockupInput>;

/** '3"', '3 x 2', '3.5in' → [w, h] */
export function parseApproxSize(s: string | undefined | null): [number, number] {
  const nums = (s ?? "").match(/\d+(\.\d+)?/g)?.map(Number).filter((n) => n > 0 && n <= 24) ?? [];
  if (nums.length >= 2) return [nums[0], nums[1]];
  if (nums.length === 1) return [nums[0], nums[0]];
  return [3, 3];
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") || null };
}

/**
 * Free mockup → Customer + Lead + Order(MOCKUP_PENDING) with a draft configuration.
 * The designer finalises the spec when uploading the proof; the customer approves that exact spec.
 */
export async function submitMockupRequest(raw: unknown, ctx: { anonOwnerId?: string | null; customerId?: string | null; utm?: Record<string, string> | null }) {
  const input = mockupInput.parse(raw);
  const { firstName, lastName } = splitName(input.name);
  const { catalog, tables } = await getCatalogFresh();
  const pt = catalog.patchTypes.find((p) => p.id === input.patchTypeId) ?? catalog.patchTypes.find((p) => p.code === "EMBROIDERED") ?? catalog.patchTypes[0];
  const [w, h] = parseApproxSize(input.approxSize);
  const quantity = Math.max(input.quantity ?? 100, pt.minQuantity);

  let estimate: { unit: number; total: number } | null = null;
  try {
    const line = priceLine({ table: tables[pt.id], widthIn: w, heightIn: h, quantity, modifiers: [] });
    estimate = { unit: line.unitPriceCents, total: line.lineSubtotalCents };
  } catch {
    estimate = null; // out-of-range sizes are quoted manually
  }

  const result = await prisma.$transaction(async (tx) => {
    const customer = await upsertCustomer(tx, { email: input.email, firstName, lastName, phone: input.phone, company: input.company, marketingConsent: input.marketingConsent });

    let artworkFileId: string | null = null;
    if (input.artworkFileId) {
      const file = await tx.artworkFile.findUnique({ where: { id: input.artworkFileId } });
      const owns = file && file.status === "UPLOADED" && ((ctx.anonOwnerId && file.anonOwnerId === ctx.anonOwnerId) || (ctx.customerId && file.customerId === ctx.customerId));
      if (owns) {
        artworkFileId = file.id;
        await tx.artworkFile.update({ where: { id: file.id }, data: { customerId: customer.id } });
      }
    }

    const config = await tx.patchConfiguration.create({
      data: {
        patchTypeId: pt.id, widthIn: w, heightIn: h, quotedSizeIn: Math.round(((w + h) / 2) * 100) / 100, quantity,
        shape: w === h ? "CIRCLE" : "RECTANGLE", artworkStatus: artworkFileId ? "UPLOADED" : "SEND_LATER", artworkFileId,
        notes: input.notes || null, customerId: customer.id, unitPriceCents: estimate?.unit ?? null, subtotalCents: estimate?.total ?? null,
      },
      include: configurationInclude,
    });

    const order = await withUniqueRef("PG", (orderNumber) =>
      tx.order.create({
        data: {
          orderNumber, customerId: customer.id, email: input.email, firstName, lastName, phone: input.phone || null, company: input.company || null,
          status: "MOCKUP_PENDING", paymentStatus: "UNPAID", source: "FREE_MOCKUP", subtotalCents: estimate?.total ?? 0, totalCents: estimate?.total ?? 0,
          customerNotes: input.notes || null, utm: ctx.utm ?? undefined,
          items: { create: [{ configurationId: config.id, productName: pt.name, quantity, unitPriceCents: estimate?.unit ?? 0, totalCents: estimate?.total ?? 0, specSnapshot: describeConfiguration(config) as object }] },
          statusEvents: { create: [{ status: "MOCKUP_PENDING", note: "Free mockup requested" }] },
        },
      }),
    );

    const request = await withUniqueRef("MR", (requestNumber) =>
      tx.mockupRequest.create({
        data: {
          requestNumber, customerId: customer.id, name: input.name, email: input.email, phone: input.phone || null, company: input.company || null,
          artworkFileId, patchTypeId: pt.id, approxSize: input.approxSize || null, quantity: input.quantity ?? null,
          deadline: input.deadline ? new Date(input.deadline) : null, notes: input.notes || null, orderId: order.id, utm: ctx.utm ?? undefined,
        },
      }),
    );

    const lead = await tx.lead.create({
      data: { email: input.email, firstName, lastName, phone: input.phone || null, company: input.company || null, source: "FREE_MOCKUP", marketingConsent: !!input.marketingConsent, utm: ctx.utm ?? undefined, payload: { requestNumber: request.requestNumber, orderNumber: order.orderNumber } },
    });
    return { request, order, lead, customer };
  });

  await emit({ type: "mockup.submitted", mockupRequestId: result.request.id, leadId: result.lead.id });
  return result;
}
