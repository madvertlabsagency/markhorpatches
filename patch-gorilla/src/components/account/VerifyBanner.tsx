"use client";
import { useActionState } from "react";
import { resendVerificationAction } from "@/app/actions/auth";

export function VerifyBanner({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendVerificationAction, undefined);
  return (
    <div className="rounded-2xl border border-gold/30 bg-gold/10 p-5">
      <p className="font-semibold">Confirm your email to see your orders.</p>
      <p className="mt-1 text-sm text-slate">We sent a link to <strong>{email}</strong>. For your security, orders and proofs placed with this email appear here once it&apos;s confirmed.</p>
      <form action={action} className="mt-3">
        <button disabled={pending} className="text-sm font-semibold text-patch underline">{pending ? "Sending…" : "Resend confirmation email"}</button>
        {state?.success && <span className="ml-3 text-sm text-success">{state.success}</span>}
        {state?.error && <span className="ml-3 text-sm text-danger">{state.error}</span>}
      </form>
    </div>
  );
}
