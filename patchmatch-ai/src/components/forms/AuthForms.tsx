"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { forgotPasswordAction, loginAction, mfaChallengeAction, registerAction, resetPasswordAction } from "@/app/actions/auth";
import { Field, Input, Checkbox } from "@/components/ui/fields";
import { FormMessage, SubmitButton } from "@/components/ui/client";
import { cn } from "@/lib/utils";

export function LoginForm({ next, googleEnabled }: { next?: string; googleEnabled: boolean }) {
  const [state, action] = useActionState(loginAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field id="email" label="Email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field id="password" label="Password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-medium text-electric hover:underline">
          Forgot password?
        </Link>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
      {googleEnabled && <GoogleButton next={next} />}
    </form>
  );
}

function GoogleButton({ next }: { next?: string }) {
  return (
    <>
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <a href={`/api/auth/google?next=${encodeURIComponent(next ?? "")}`} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface text-sm font-semibold hover:bg-surface-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
        </svg>
        Continue with Google
      </a>
    </>
  );
}

export function RegisterForm({ defaultRole, next, googleEnabled }: { defaultRole: "buyer" | "seller"; next?: string; googleEnabled: boolean }) {
  const [state, action] = useActionState(registerAction, null);
  const [role, setRole] = useState(defaultRole);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-2/60 p-1" role="radiogroup" aria-label="Account type">
        {(["buyer", "seller"] as const).map((r) => (
          <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)} className={cn("rounded-lg py-2 text-sm font-semibold transition", role === r ? "bg-surface shadow-[var(--shadow-card)]" : "text-muted")}>
            {r === "buyer" ? "I need patches" : "I manufacture patches"}
          </button>
        ))}
      </div>
      <Field id="name" label="Full name" error={fe?.name}>
        <Input id="name" name="name" autoComplete="name" required />
      </Field>
      <Field id="email" label={role === "seller" ? "Business email" : "Email"} error={fe?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field id="password" label="Password" hint="At least 10 characters with a letter and a number." error={fe?.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Checkbox
        id="terms"
        name="terms"
        required
        label={
          <>
            I agree to the{" "}
            <Link href={role === "seller" ? "/seller-terms" : "/buyer-terms"} className="text-electric underline" target="_blank">
              {role === "seller" ? "Seller Terms" : "Buyer Terms"}
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-electric underline" target="_blank">
              Privacy Policy
            </Link>
          </>
        }
      />
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
      {googleEnabled && role === "buyer" && <GoogleButton next={next} />}
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(forgotPasswordAction, null);
  return (
    <form action={action} className="space-y-4">
      <Field id="email" label="Email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field id="password" label="New password" hint="At least 10 characters with a letter and a number.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Field id="confirm" label="Confirm password">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full">Set new password</SubmitButton>
    </form>
  );
}

export function MfaForm({ next }: { next?: string }) {
  const [state, action] = useActionState(mfaChallengeAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field id="code" label="Authentication code" hint="6-digit code from your authenticator app, or a recovery code.">
        <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus className="tabular text-center text-lg tracking-[0.4em]" maxLength={12} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full">Verify</SubmitButton>
    </form>
  );
}
