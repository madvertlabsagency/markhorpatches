import "server-only";
import { ZodError } from "zod";
import { unstable_rethrow } from "next/navigation";
import { AuthError } from "@/lib/auth/session";
import { DomainError } from "@/lib/domain/rfq";
import { TransitionError } from "@/lib/state-machines";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import type { ActionState } from "@/lib/action-state";

const AUTH_MESSAGES: Record<AuthError["code"], string> = {
  UNAUTHENTICATED: "Please sign in again.",
  FORBIDDEN: "You don't have permission to do that.",
  MFA_REQUIRED: "Two-factor verification is required for this action.",
  NOT_VERIFIED: "Please verify your email first.",
};

/** Converts expected errors into user-facing ActionState; unexpected errors are logged, never leaked. */
export function toActionError(e: unknown): ActionState {
  unstable_rethrow(e);
  if (e instanceof DomainError) return { ok: false, error: e.message };
  if (e instanceof AuthError) return { ok: false, error: e.code === "FORBIDDEN" && e.message !== "FORBIDDEN" ? e.message : AUTH_MESSAGES[e.code] };
  if (e instanceof TransitionError) return { ok: false, error: "That action isn't possible in the current state. Refresh and try again." };
  if (e instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const i of e.issues) fieldErrors[i.path.join(".") || "form"] = i.message;
    return { ok: false, error: e.issues[0]?.message ?? "Please check the form.", fieldErrors };
  }
  console.error("[action] unexpected error", e);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function guard(key: string, limit = 30, windowMs = 60_000): Promise<ActionState | null> {
  const ip = await clientIp().catch(() => "unknown");
  const rl = rateLimit(`${key}:${ip}`, limit, windowMs);
  return rl.ok ? null : { ok: false, error: "Too many attempts. Please wait a minute and try again." };
}

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function all(fd: FormData, key: string): string[] {
  return fd.getAll(key).filter((v): v is string => typeof v === "string" && v.length > 0);
}
