import "server-only";
import { prisma } from "@/lib/db";
import type { CrmAdapter, CrmEventPayload } from "./types";

/**
 * GoHighLevel (LeadConnector API v2) adapter.
 *  • Upserts the contact (GHL de-duplicates by email/phone per location).
 *  • Creates one opportunity per order and moves it through stages afterwards.
 * All calls are logged to IntegrationLog with secrets stripped.
 */
const BASE = "https://services.leadconnectorhq.com";

const STAGE_FOR: Partial<Record<CrmEventPayload["type"], string | undefined>> = {
  free_mockup_submitted: process.env.GHL_STAGE_MOCKUP || process.env.GHL_STAGE_NEW_LEAD,
  quote_submitted: process.env.GHL_STAGE_NEW_LEAD,
  checkout_started: process.env.GHL_STAGE_NEW_LEAD,
  proof_ready: process.env.GHL_STAGE_PROOF_READY,
  proof_approved: process.env.GHL_STAGE_APPROVED,
  order_placed: process.env.GHL_STAGE_WON,
};

async function call<T>(operation: string, path: string, init: { method: string; body?: unknown }): Promise<T> {
  const started = Date.now();
  let status: number | undefined;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: init.method,
      headers: { Authorization: `Bearer ${process.env.GHL_API_KEY}`, Version: "2021-07-28", "Content-Type": "application/json", Accept: "application/json" },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
    status = res.status;
    const json = (await res.json().catch(() => ({}))) as T;
    await prisma.integrationLog.create({
      data: { provider: "ghl", operation, success: res.ok, statusCode: res.status, durationMs: Date.now() - started, request: { path, method: init.method }, response: res.ok ? undefined : (json as object), error: res.ok ? null : `HTTP ${res.status}` },
    });
    if (!res.ok) throw new Error(`GHL ${operation} failed: HTTP ${res.status}`);
    return json;
  } catch (e) {
    if (status === undefined) {
      await prisma.integrationLog.create({ data: { provider: "ghl", operation, success: false, durationMs: Date.now() - started, request: { path, method: init.method }, error: e instanceof Error ? e.message : String(e) } }).catch(() => {});
    }
    throw e;
  }
}

export const ghlAdapter: CrmAdapter = {
  name: "ghl",
  get enabled() {
    return !!(process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID);
  },
  async deliver(event, ctx) {
    const locationId = process.env.GHL_LOCATION_ID!;
    const customFields = Object.entries(event.fields)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([key, value]) => ({ key, field_value: String(value) }));

    const contactRes = await call<{ contact?: { id: string } }>("contact.upsert", "/contacts/upsert", {
      method: "POST",
      body: {
        locationId,
        email: event.contact.email,
        firstName: event.contact.firstName ?? undefined,
        lastName: event.contact.lastName ?? undefined,
        phone: event.contact.phone ?? undefined,
        companyName: event.contact.company ?? undefined,
        source: "patchgorilla.com",
        tags: ["patch-gorilla", event.type.replace(/_/g, "-")],
        customFields,
      },
    });
    const contactId = contactRes.contact?.id;
    if (!contactId) return {};

    const pipelineId = process.env.GHL_PIPELINE_ID;
    const stageId = STAGE_FOR[event.type];
    if (!pipelineId || !stageId) return { contactId };

    const name = event.orderNumber ? `Patch order ${event.orderNumber}` : `Patch lead — ${event.contact.email}`;
    if (ctx.existingOpportunityId) {
      await call("opportunity.update", `/opportunities/${ctx.existingOpportunityId}`, {
        method: "PUT",
        body: { pipelineStageId: stageId, monetaryValue: event.valueCents ? event.valueCents / 100 : undefined, status: event.type === "order_placed" ? "won" : "open" },
      });
      return { contactId, opportunityId: ctx.existingOpportunityId };
    }
    const opp = await call<{ opportunity?: { id: string } }>("opportunity.create", "/opportunities/", {
      method: "POST",
      body: { locationId, pipelineId, pipelineStageId: stageId, contactId, name, status: event.type === "order_placed" ? "won" : "open", monetaryValue: event.valueCents ? event.valueCents / 100 : undefined },
    });
    return { contactId, opportunityId: opp.opportunity?.id };
  },
};
