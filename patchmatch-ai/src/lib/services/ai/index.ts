import "server-only";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import { prisma } from "@/lib/db";

/**
 * PROVIDER-AGNOSTIC AI SERVICE
 *
 * Every AI feature is a versioned "task": a prompt, a Zod output schema and a deterministic
 * fallback. Guardrails:
 *  • Structured output only — responses are validated against the schema; invalid output is
 *    rejected and the deterministic fallback is used instead.
 *  • Sensitive-data minimisation — callers pass only the fields a task needs (never buyer
 *    contact details or raw artwork).
 *  • Every call is logged in AIExecution (provider, model, prompt version, tokens, cost, latency).
 *  • AI is advisory: it never authorises payments, approves sellers, discloses data, or
 *    overrides the deterministic eligibility filters.
 *
 * Providers: "rules" (deterministic, no external calls — the default) and "anthropic".
 */

export const DEFAULT_MODEL = "claude-opus-5-5";
/** USD per 1M tokens (input, output) — used for cost tracking only. */
const PRICING: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

export interface AITask<I, O> {
  feature: string;
  promptVersion: string;
  schema: z.ZodType<O>;
  system: string;
  buildPrompt: (input: I) => string;
  fallback: (input: I) => O;
  /** Minimum self-reported confidence to accept the AI output; below it the fallback wins. */
  minConfidence?: number;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}

export interface AIRunResult<O> {
  output: O;
  source: "ai" | "rules";
  executionId: string;
  provider: string;
  model: string;
}

export function aiProviderName() {
  return process.env.AI_PROVIDER === "anthropic" && process.env.ANTHROPIC_API_KEY ? "anthropic" : "rules";
}

let client: Anthropic | null = null;
function anthropic() {
  if (!client) client = new Anthropic({ timeout: 45_000, maxRetries: 1 });
  return client;
}

function costMicros(model: string, input: number, output: number) {
  const [i, o] = PRICING[model] ?? [0, 0];
  return Math.round(input * i + output * o); // $/1M tokens × tokens = micro-dollars
}

export async function runAITask<I, O>(task: AITask<I, O>, input: I, ctx: { entityType?: string; entityId?: string; actorId?: string } = {}): Promise<AIRunResult<O>> {
  const provider = aiProviderName();
  const prompt = task.buildPrompt(input);
  const inputHash = createHash("sha256").update(`${task.promptVersion}\n${prompt}`).digest("hex");
  const started = Date.now();
  const log = (data: { status: "SUCCEEDED" | "FAILED" | "REJECTED_SCHEMA" | "SKIPPED"; model: string; output?: unknown; confidence?: number | null; inputTokens?: number; outputTokens?: number; error?: string; provider?: string }) =>
    prisma.aIExecution.create({
      data: {
        feature: task.feature, provider: data.provider ?? provider, model: data.model, promptVersion: task.promptVersion, status: data.status,
        entityType: ctx.entityType, entityId: ctx.entityId, actorId: ctx.actorId, inputHash,
        output: data.output === undefined ? undefined : JSON.parse(JSON.stringify(data.output)), confidence: data.confidence ?? null,
        latencyMs: Date.now() - started, inputTokens: data.inputTokens ?? 0, outputTokens: data.outputTokens ?? 0,
        costMicros: costMicros(data.model, data.inputTokens ?? 0, data.outputTokens ?? 0), error: data.error?.slice(0, 2000),
      },
    });

  const withFallback = async (status: "SKIPPED" | "FAILED" | "REJECTED_SCHEMA", error?: string, usage?: { inputTokens: number; outputTokens: number }) => {
    const output = task.fallback(input);
    if (status !== "SKIPPED") await log({ status, model: DEFAULT_MODEL, provider: "anthropic", error, ...usage });
    const exec = await log({ status: "SUCCEEDED", model: "rules-engine", provider: "rules", output });
    return { output, source: "rules" as const, executionId: exec.id, provider: "rules", model: "rules-engine" };
  };

  if (provider !== "anthropic") return withFallback("SKIPPED");

  try {
    const response = await anthropic().beta.messages.parse({
      model: DEFAULT_MODEL,
      max_tokens: task.maxTokens ?? 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: task.system,
      messages: [{ role: "user", content: prompt }],
      output_config: { effort: task.effort ?? "low", format: betaZodOutputFormat(task.schema as z.ZodType<O>) },
    });
    const usage = { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
    if (response.stop_reason === "refusal") return withFallback("FAILED", `Model declined (${response.stop_details?.category ?? "unknown"})`, usage);
    if (response.stop_reason === "max_tokens") return withFallback("FAILED", "Output truncated at max_tokens", usage);
    const parsed = response.parsed_output as O | null;
    const valid = parsed ? task.schema.safeParse(parsed) : null;
    if (!valid?.success) return withFallback("REJECTED_SCHEMA", "Output failed schema validation", usage);
    const confidence = (valid.data as { confidence?: number }).confidence ?? null;
    if (task.minConfidence !== undefined && confidence !== null && confidence < task.minConfidence) {
      return withFallback("REJECTED_SCHEMA", `Confidence ${confidence} below threshold ${task.minConfidence}`, usage);
    }
    const exec = await log({ status: "SUCCEEDED", model: response.model, output: valid.data, confidence, ...usage });
    return { output: valid.data, source: "ai", executionId: exec.id, provider: "anthropic", model: response.model };
  } catch (e) {
    const msg = e instanceof Anthropic.APIError ? `API ${e.status}: ${e.message}` : e instanceof Error ? e.message : String(e);
    return withFallback("FAILED", msg);
  }
}

export { z };
