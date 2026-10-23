import "server-only";
import { prisma } from "@/lib/db";
import { runAITask, z, type AITask } from "@/lib/services/ai";
import { demandByPatchType, executiveMetrics, fastestSellers, operationalQueues, rangeFromDays } from "@/lib/admin/metrics";
import { formatMoney } from "@/lib/money";
import { patchTypeName } from "@/lib/catalog";

/**
 * Admin assistant. Answers are GROUNDED: the question is routed to a fixed set of safe,
 * read-only queries that compute real numbers; AI (when configured) may only rephrase those
 * facts. It cannot run arbitrary queries, change data, or see buyer contact details.
 */
type Intent = "unmatched" | "demand" | "fastest" | "cost_per_sold" | "attention" | "revenue" | "funnel" | "unknown";

export function routeQuestion(q: string): Intent {
  const s = q.toLowerCase();
  if (/unmatched|no match|manual sourcing/.test(s)) return "unmatched";
  if (/demand|popular|most requested|which patch/.test(s)) return "demand";
  if (/fast|respon|quickest/.test(s)) return "fastest";
  if (/cost per sold|effective cost|cpl|cost per lead/.test(s)) return "cost_per_sold";
  if (/attention|failed|issue|problem|transaction|stuck|dispute|claim/.test(s)) return "attention";
  if (/revenue|money|sales|earn/.test(s)) return "revenue";
  if (/funnel|conversion|qualif|sell[- ]through|match rate/.test(s)) return "funnel";
  return "unknown";
}

export async function factsFor(intent: Intent): Promise<{ facts: string[]; links: { label: string; href: string }[] }> {
  const m30 = () => executiveMetrics(rangeFromDays(30));
  switch (intent) {
    case "unmatched": {
      const rows = await prisma.rfq.findMany({ where: { isDemo: false, status: { in: ["MANUAL_SOURCING", "MATCHING"] } }, select: { publicRef: true, status: true, patchType: true, id: true }, take: 20, orderBy: { qualifiedAt: "asc" } });
      return { facts: rows.length ? rows.map((r) => `${r.publicRef} (${patchTypeName(r.patchType)}) — ${r.status === "MANUAL_SOURCING" ? "no eligible manufacturer" : "matched, not yet published"}`) : ["There are no unmatched RFQs right now."], links: [{ label: "Matching", href: "/admin/matching" }] };
    }
    case "demand": {
      const d = await demandByPatchType(rangeFromDays(30));
      return { facts: d.length ? d.map((x) => `${patchTypeName(x.patchType)}: ${x.count} RFQs (30 days)`) : ["No RFQs in the last 30 days."], links: [{ label: "Analytics", href: "/admin/analytics" }] };
    }
    case "fastest": {
      const s = await fastestSellers();
      return { facts: s.length ? s.map((x) => `${x.tradingName ?? x.legalName}: avg ${Math.round((x.avgResponseMinutes ?? 0) / 60)}h to quote (${x.quotesSubmitted} quotes)`) : ["Not enough quote history yet (needs 3+ quotes per seller)."], links: [{ label: "Sellers", href: "/admin/sellers" }] };
    }
    case "cost_per_sold": {
      const m = await m30();
      return { facts: [m.effectiveCostPerSoldMinor != null ? `Effective cost per sold RFQ (30d): ${formatMoney(m.effectiveCostPerSoldMinor)}` : "Effective cost per sold RFQ is unavailable — record ad spend in Marketing and sell at least one RFQ.", m.buyerCplMinor != null ? `Buyer CPL: ${formatMoney(m.buyerCplMinor)}` : "Buyer CPL unavailable (no ad spend recorded)."], links: [{ label: "Marketing", href: "/admin/marketing" }] };
    }
    case "attention": {
      const q = await operationalQueues();
      return { facts: [`${q.failedPayments} failed/disputed payments in 7 days`, `${q.claims} open quality claims`, `${q.review} RFQs awaiting review`, `${q.verification} sellers awaiting verification`, `${q.invoiceRequests} unpaid invoices`, `${q.deadJobs} dead background jobs`], links: [{ label: "Payments", href: "/admin/payments?status=FAILED" }, { label: "Disputes", href: "/admin/disputes" }] };
    }
    case "revenue": {
      const m = await m30();
      return { facts: [`Gross unlock revenue (30d): ${formatMoney(m.grossRevenueMinor)}`, `Refunds/credits: ${formatMoney(m.refundsMinor)}`, `Net: ${formatMoney(m.netRevenueMinor)}`, `Unlocks: ${m.unlockCount}`], links: [{ label: "Command center", href: "/admin" }] };
    }
    case "funnel": {
      const m = await m30();
      const p = (v: number | null) => (v == null ? "n/a" : `${Math.round(v * 100)}%`);
      return { facts: [`Raw leads ${m.rawLeads} → verified ${m.verified} → qualified ${m.qualified} → matched ${m.matched} → sold ${m.sold}`, `Qualification ${p(m.qualificationRate)}, match ${p(m.matchRate)}, sell-through ${p(m.sellThroughRate)}`], links: [{ label: "Analytics", href: "/admin/analytics" }] };
    }
    default:
      return { facts: ["I can answer: unmatched RFQs, demand by patch type, fastest sellers, effective cost per sold RFQ, revenue, funnel, and what needs attention."], links: [] };
  }
}

const phraseSchema = z.object({ answer: z.string().max(1200), confidence: z.number().min(0).max(1) });

const phraseTask: AITask<{ question: string; facts: string[] }, z.infer<typeof phraseSchema>> = {
  feature: "admin_assistant",
  promptVersion: "admin-assistant-v1",
  schema: phraseSchema,
  effort: "low",
  system: "You summarise marketplace operations facts for an internal admin. Use ONLY the facts provided; never invent numbers. Be concise.",
  buildPrompt: (i) => `Question: ${i.question}\nFacts:\n${i.facts.map((f) => `- ${f}`).join("\n")}`,
  fallback: (i) => ({ answer: i.facts.join("\n"), confidence: 1 }),
};

export async function askAdminAssistant(question: string, actorId: string) {
  const intent = routeQuestion(question);
  const { facts, links } = await factsFor(intent);
  const r = await runAITask(phraseTask, { question: question.slice(0, 500), facts }, { entityType: "AdminAssistant", actorId });
  return { intent, answer: r.output.answer, facts, links, source: r.source };
}
