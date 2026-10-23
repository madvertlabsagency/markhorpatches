import "server-only";
import { objectKey } from "@/lib/files";
import { prisma } from "@/lib/db";
import { sendEmailJob } from "@/lib/notifications";
import { processRfq } from "@/lib/domain/rfq";
import { runMatching } from "@/lib/domain/matching";
import { expireReservations } from "@/lib/domain/unlock";
import { runAITask } from "@/lib/services/ai";
import { rfqEnrichTask, type ArtworkStats } from "@/lib/ai/tasks";
import { redactContactInfo } from "@/lib/rfq/disclosure";
import { storage } from "@/lib/services/storage";
import { artworkStats } from "@/lib/services/storage/previews";
import { buyerQuoteReminder, sellerQuoteReminder } from "@/lib/domain/engagement";
import type { JobHandler } from "./queue";

async function enrichRfq(rfqId: string) {
  const rfq = await prisma.rfq.findUnique({ where: { id: rfqId }, include: { spec: true, artwork: { include: { attachment: true } }, qualifications: { where: { isCurrent: true } } } });
  if (!rfq?.spec) return;
  const stats: ArtworkStats[] = [];
  for (const a of rfq.artwork) {
    const att = a.attachment;
    if (att.status !== "READY") continue;
    if (["png", "jpg", "jpeg"].includes(att.extension)) {
      try {
        stats.push({ type: att.extension, ...(await artworkStats(await storage().read(objectKey(att.storageKey)!))) });
      } catch {
        stats.push({ type: att.extension });
      }
    } else stats.push({ type: att.extension });
  }
  const s = rfq.spec;
  const result = await runAITask(
    rfqEnrichTask,
    {
      patchType: rfq.patchType, intendedUse: rfq.intendedUse, quantity: s.quantity, width: s.width, height: s.height, unit: s.unit, backing: s.backing, colorCount: s.colorCount,
      specialFinishing: s.specialFinishing, rush: s.rush, destinationCountry: s.destinationCountry,
      notes: redactContactInfo(s.notes).text, artworkNotes: redactContactInfo(s.artworkNotes).text, artwork: stats, missingFields: rfq.qualifications[0]?.missingFields ?? [],
    },
    { entityType: "Rfq", entityId: rfq.id },
  );
  // The summary is shown to sellers before unlock, so it is redacted once more defensively.
  await prisma.rfqSpecification.update({ where: { rfqId }, data: { aiSummary: redactContactInfo(result.output.summary).text } });
  const q = rfq.qualifications[0];
  if (q && result.output.clarificationQuestions.length) {
    const existing = Array.isArray(q.clarificationQuestions) ? (q.clarificationQuestions as string[]) : [];
    const merged = [...new Set([...existing, ...result.output.clarificationQuestions])].slice(0, 6);
    await prisma.rfqQualification.update({ where: { id: q.id }, data: { clarificationQuestions: merged } });
  }
}

export const JOB_HANDLERS: Record<string, JobHandler> = {
  "email.send": sendEmailJob,
  "rfq.process": async (p) => processRfq(String(p.rfqId)),
  "rfq.match": async (p) => {
    await runMatching(String(p.rfqId));
  },
  "ai.enrich_rfq": async (p) => enrichRfq(String(p.rfqId)),
  "buyer.quote_reminder": async (p) => void (await buyerQuoteReminder(String(p.quoteId), Number(p.n ?? 1))),
  "seller.quote_reminder": async (p) => void (await sellerQuoteReminder(String(p.rfqId), String(p.sellerId))),
  "reservations.expire": async () => {
    await expireReservations();
  },
};
