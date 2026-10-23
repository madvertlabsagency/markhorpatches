"use client";

import { useActionState, useState } from "react";
import { BellOff, Bell, Loader2, ShieldCheck } from "lucide-react";
import { confirmIntentAction, remindersAction, updatePrivacyAction } from "@/app/actions/intent";
import { cn } from "@/lib/utils";

type Auth = { token?: string; rfqId?: string };
function Hidden({ auth }: { auth: Auth }) {
  return auth.token ? <input type="hidden" name="token" value={auth.token} /> : <input type="hidden" name="rfqId" value={auth.rfqId} />;
}
function Result({ state }: { state: Awaited<ReturnType<typeof confirmIntentAction>> }) {
  if (!state) return null;
  return state.ok ? <p className="text-sm font-medium text-success" role="status">{state.message}</p> : <p className="text-sm font-medium text-danger" role="alert">{state.error}</p>;
}

const INTENT_LABEL: Record<string, string> = {
  NOT_CONFIRMED: "Not confirmed yet",
  READY_FOR_QUOTES: "Ready for quotes",
  RESEARCHING: "Comparing options for later",
  NO_LONGER_INTERESTED: "Found a supplier",
  EXPIRED: "Confirmation expired",
};

/** "Are you still looking to receive quotations?" — three explicit answers, recorded with a timestamp. */
export function IntentPrompt({ auth, status, confirmedAt, compact }: { auth: Auth; status: string; confirmedAt: string | null; compact?: boolean }) {
  const [state, action, pending] = useActionState(confirmIntentAction, null);
  const btn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-60";
  return (
    <form action={action} className={cn("space-y-3", !compact && "card p-5")}>
      <Hidden auth={auth} />
      <div>
        <p className="font-semibold">Are you still looking to receive quotations for this project?</p>
        <p className="mt-0.5 text-xs text-muted">
          Current answer: <strong className="text-fg">{INTENT_LABEL[status] ?? status}</strong>
          {confirmedAt ? ` · ${new Date(confirmedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button name="choice" value="READY" disabled={pending} className={cn(btn, "bg-electric text-[var(--pm-primary-fg)] hover:bg-[#B93C0A]")}>{pending && <Loader2 className="h-4 w-4 animate-spin" />}Yes, I&apos;m ready for quotes</button>
        <button name="choice" value="LATER" disabled={pending} className={cn(btn, "border border-line bg-surface hover:border-electric/50")}>I&apos;m comparing options for later</button>
        <button name="choice" value="FOUND_SUPPLIER" disabled={pending} className={cn(btn, "border border-line bg-surface text-muted hover:border-danger/40")}>I&apos;ve already found a supplier</button>
      </div>
      <Result state={state} />
    </form>
  );
}

const OPTIONS = [
  { code: "PLATFORM_MESSAGING_ONLY", label: "A. Keep my contact details private", hint: "Quotes and messages through PatchMatch only." },
  { code: "BUYER_SELECTED", label: "B. Share only with manufacturers I select", hint: "You approve each manufacturer from the conversation." },
  { code: "FULL_CONTACT", label: "C. Let matched manufacturers contact me directly", hint: "Manufacturers who take your request receive your contact details." },
] as const;

export function PrivacyForm({ auth, mode, sharedWith }: { auth: Auth; mode: string; sharedWith: number }) {
  const [state, action, pending] = useActionState(updatePrivacyAction, null);
  const [sel, setSel] = useState(mode);
  return (
    <form action={action} className="card space-y-4 p-5">
      <Hidden auth={auth} />
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 text-green" />
        <div>
          <p className="font-semibold">Who may see your contact details?</p>
          <p className="text-xs text-muted">Changes apply from now on. {sharedWith > 0 ? `${sharedWith} manufacturer(s) already received your details; that can't be recalled.` : "No manufacturer has received your direct contact details."}</p>
        </div>
      </div>
      <fieldset className="space-y-2">
        <legend className="sr-only">Contact privacy</legend>
        {OPTIONS.map((o) => (
          <label key={o.code} className={cn("flex cursor-pointer gap-3 rounded-xl border p-3 text-sm", sel === o.code ? "border-electric bg-electric/5" : "border-line")}>
            <input type="radio" name="disclosureMode" value={o.code} checked={sel === o.code} onChange={() => setSel(o.code)} className="mt-1 accent-[var(--pm-accent)]" />
            <span><span className="font-semibold">{o.label}</span><span className="block text-muted">{o.hint}</span></span>
          </label>
        ))}
      </fieldset>
      {sel !== "PLATFORM_MESSAGING_ONLY" && (
        <label className="flex gap-2 rounded-xl bg-warning/10 p-3 text-sm">
          <input type="checkbox" name="consentDirectContact" className="mt-0.5" />
          I agree to share my name, company, email, phone and website as described above.
        </label>
      )}
      <button disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-navy">{pending && <Loader2 className="h-4 w-4 animate-spin" />}Save privacy choice</button>
      <Result state={state} />
    </form>
  );
}

export function RemindersToggle({ auth, optOut }: { auth: Auth; optOut: boolean }) {
  const [state, action, pending] = useActionState(remindersAction, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3 text-sm">
      <Hidden auth={auth} />
      <input type="hidden" name="optOut" value={optOut ? "0" : "1"} />
      <span className="text-muted">{optOut ? "Reminder emails are off for this request." : "We may send up to two reminders when a quote is waiting."}</span>
      <button disabled={pending} className="inline-flex items-center gap-1.5 font-semibold text-electric">{optOut ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}{optOut ? "Turn reminders on" : "Turn reminders off"}</button>
      <Result state={state} />
    </form>
  );
}
