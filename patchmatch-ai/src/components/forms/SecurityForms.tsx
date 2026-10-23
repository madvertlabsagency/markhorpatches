"use client";

import { useState, useTransition } from "react";
import { ActionForm } from "@/components/ui/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/fields";
import { Alert } from "@/components/ui/primitives";
import { beginMfaSetupAction, changePasswordAction, confirmMfaSetupAction, disableMfaAction } from "@/app/actions/auth";
import type { ActionState } from "@/lib/action-state";

export function SecurityForms({ mfaEnabled, isStaff, email, hasPassword }: { mfaEnabled: boolean; isStaff: boolean; email: string; hasPassword: boolean }) {
  const [secret, setSecret] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-8">
      {codes ? (
        <Alert tone="success" title="Two-factor authentication is on — save your recovery codes">
          <p className="mb-2">Each code works once if you lose your device. They won't be shown again.</p>
          <ul className="tabular grid grid-cols-2 gap-1 font-mono text-sm text-fg">{codes.map((c) => <li key={c}>{c}</li>)}</ul>
        </Alert>
      ) : mfaEnabled ? (
        isStaff ? <p className="text-sm text-muted">Staff accounts must keep two-factor authentication enabled.</p> : (
          <ActionForm action={disableMfaAction} submitLabel="Turn off two-factor" submitVariant="danger" confirm="Turn off two-factor authentication?">
            <Field id="dpw" label="Confirm your password"><Input id="dpw" name="password" type="password" required /></Field>
          </ActionForm>
        )
      ) : secret ? (
        <div className="space-y-4">
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>In your authenticator app, add an account manually with this key (time-based, 6 digits):</li>
          </ol>
          <p className="tabular rounded-xl bg-surface-2 px-4 py-3 text-center font-mono text-lg tracking-widest break-all">{secret.match(/.{1,4}/g)?.join(" ")}</p>
          <p className="text-xs text-muted">Account: {email} · Issuer: PatchMatch AI</p>
          <ActionForm action={async (p: ActionState, fd: FormData) => { const r = await confirmMfaSetupAction(p, fd); if (r?.ok && r.data?.recoveryCodes) setCodes(r.data.recoveryCodes as string[]); return r; }} submitLabel="Verify and turn on">
            <Field id="code" label="Enter the 6-digit code"><Input id="code" name="code" inputMode="numeric" maxLength={6} required className="tabular max-w-40 text-center tracking-[0.3em]" /></Field>
          </ActionForm>
        </div>
      ) : (
        <div>
          <Button type="button" loading={pending} onClick={() => start(async () => { const r = await beginMfaSetupAction(); if (r?.ok) setSecret(String(r.data?.secret)); else setErr(r && !r.ok ? r.error : "Error"); })}>Set up two-factor authentication</Button>
          {err && <p className="mt-2 text-sm text-danger">{err}</p>}
        </div>
      )}
      {hasPassword && (
        <div className="border-t border-line pt-6">
          <h3 className="mb-3 font-semibold">Change password</h3>
          <ActionForm action={changePasswordAction} submitLabel="Update password" resetOnSuccess>
            <Field id="current" label="Current password"><Input id="current" name="current" type="password" autoComplete="current-password" required /></Field>
            <Field id="password" label="New password" hint="At least 10 characters with a letter and a number."><Input id="password" name="password" type="password" autoComplete="new-password" required /></Field>
          </ActionForm>
        </div>
      )}
    </div>
  );
}
