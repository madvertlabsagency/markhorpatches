"use client";
import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction, type FormState } from "@/app/actions/auth";
import { Field, Input } from "@/components/ui/fields";
import { Button } from "@/components/ui/Button";

function Msg({ state }: { state: FormState }) {
  if (state?.error) return <p role="alert" className="rounded-xl bg-danger/5 p-3 text-sm font-medium text-danger">{state.error}</p>;
  if (state?.success) return <p role="status" className="rounded-xl bg-success/10 p-3 text-sm font-medium text-success">{state.success}</p>;
  return null;
}

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {notice && <p className="rounded-xl bg-success/10 p-3 text-sm font-medium text-success">{notice}</p>}
      <Msg state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" htmlFor="email" required><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Password" htmlFor="password" required><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
      <Button className="w-full" size="lg" disabled={pending} arrow>{pending ? "Signing in…" : "Sign in"}</Button>
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="font-semibold text-patch">Forgot password?</Link>
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-patch">Create an account</Link>
      </div>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(registerAction, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <Msg state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Full name" htmlFor="name" required error={fe.name}><Input id="name" name="name" autoComplete="name" required /></Field>
      <Field label="Email" htmlFor="email" required error={fe.email}><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Password" htmlFor="password" required error={fe.password} hint="At least 10 characters."><Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required /></Field>
      <Button className="w-full" size="lg" disabled={pending} arrow>{pending ? "Creating…" : "Create account"}</Button>
      <p className="text-center text-sm text-slate">Already have one? <Link href="/login" className="font-semibold text-patch">Sign in</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <Msg state={state} />
      <Field label="Email" htmlFor="email" required><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Button className="w-full" size="lg" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <Msg state={state} />
      <input type="hidden" name="token" value={token} />
      <Field label="New password" htmlFor="password" required error={state?.fieldErrors?.password} hint="At least 10 characters."><Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required /></Field>
      <Button className="w-full" size="lg" disabled={pending}>{pending ? "Saving…" : "Set new password"}</Button>
    </form>
  );
}
