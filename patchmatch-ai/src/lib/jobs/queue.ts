import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Postgres-backed job queue. Workers claim jobs with `FOR UPDATE SKIP LOCKED`, so several
 * workers (cron + inline kicks) never run the same job twice. Retries use exponential backoff
 * and jobs dead-letter after maxAttempts. A Redis queue can replace this behind the same API.
 */

export type JobType =
  | "email.send"
  | "rfq.process"
  | "rfq.match"
  | "rfq.notify_sellers"
  | "reservations.expire"
  | "seller.metrics"
  | "ai.enrich_rfq";

type Tx = Prisma.TransactionClient | typeof prisma;

let kickScheduled = false;

/** Runs queued jobs right after the current response is sent (no frequent cron needed). */
function scheduleKick() {
  if (kickScheduled || process.env.JOBS_INLINE === "false") return;
  try {
    kickScheduled = true;
    after(async () => {
      kickScheduled = false;
      const { JOB_HANDLERS } = await import("./handlers");
      for (let i = 0; i < 5; i++) {
        const done = await runJobs(JOB_HANDLERS, 10);
        if (done.length < 10) break;
      }
    });
  } catch {
    kickScheduled = false; // outside a request (scripts/tests): the cron or `npm run jobs:run` processes the queue
  }
}

export async function enqueue(type: JobType, payload: Record<string, unknown>, opts: { dedupeKey?: string; runAt?: Date; maxAttempts?: number; tx?: Tx } = {}) {
  scheduleKick();
  const db = opts.tx ?? prisma;
  const data = { type, payload: payload as Prisma.InputJsonValue, runAt: opts.runAt ?? new Date(), maxAttempts: opts.maxAttempts ?? 5, dedupeKey: opts.dedupeKey };
  if (opts.dedupeKey) {
    return db.backgroundJob.upsert({ where: { dedupeKey: opts.dedupeKey }, create: data, update: {} });
  }
  return db.backgroundJob.create({ data });
}

export type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

export async function claimJobs(limit = 10) {
  return prisma.$queryRaw<{ id: string; type: string; payload: Record<string, unknown>; attempts: number; maxAttempts: number }[]>`
    UPDATE "BackgroundJob" SET "status" = 'RUNNING', "lockedAt" = now(), "attempts" = "attempts" + 1
    WHERE "id" IN (
      SELECT "id" FROM "BackgroundJob"
      WHERE ("status" = 'QUEUED' AND "runAt" <= now())
         OR ("status" = 'RUNNING' AND "lockedAt" < now() - interval '10 minutes')
      ORDER BY "runAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "type", "payload", "attempts", "maxAttempts"`;
}

export async function runJobs(handlers: Record<string, JobHandler>, limit = 10) {
  const jobs = await claimJobs(limit);
  const results: { id: string; type: string; ok: boolean; error?: string }[] = [];
  for (const job of jobs) {
    const handler = handlers[job.type];
    try {
      if (!handler) throw new Error(`No handler for job type ${job.type}`);
      await handler(job.payload);
      await prisma.backgroundJob.update({ where: { id: job.id }, data: { status: "SUCCEEDED", completedAt: new Date(), lastError: null } });
      results.push({ id: job.id, type: job.type, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const dead = job.attempts >= job.maxAttempts;
      const backoffMs = Math.min(60 * 60_000, 2 ** job.attempts * 30_000);
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: { status: dead ? "DEAD" : "QUEUED", lastError: msg.slice(0, 2000), runAt: new Date(Date.now() + backoffMs), lockedAt: null },
      });
      console.error(`[jobs] ${job.type} ${job.id} failed (attempt ${job.attempts}): ${msg}`);
      results.push({ id: job.id, type: job.type, ok: false, error: msg });
    }
  }
  return results;
}
