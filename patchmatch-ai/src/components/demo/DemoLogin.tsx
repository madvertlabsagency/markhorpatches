"use client";

import { useActionState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

/** Signs in to a demo presenter account through the normal password login. */
export function DemoLoginButton({ email, password, next, label, className }: { email: string; password: string; next: string; label: string; className?: string }) {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="password" value={password} />
      <input type="hidden" name="next" value={next} />
      <button type="submit" disabled={pending} className={cn("inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 font-semibold transition disabled:opacity-60", className)}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {label} <ArrowRight className="h-4 w-4" />
      </button>
      {state && !state.ok && <p className="text-xs text-danger" role="alert">{state.error}</p>}
    </form>
  );
}
