"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { projectStatusAction } from "@/app/actions/projects";

export function ProjectUpdateForm({ rfqId, audience, options }: { rfqId: string; audience: "buyer" | "seller"; options: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState(projectStatusAction, null);
  return (
    <form action={action} className="mt-4 flex flex-wrap items-end gap-2">
      <input type="hidden" name="rfqId" value={rfqId} />
      <input type="hidden" name="side" value={audience} />
      <label className="text-sm">
        <span className="mb-1 block text-xs font-semibold text-muted">Update status</span>
        <select name="status" className="h-10 rounded-xl border border-line bg-surface px-3 text-sm">{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      </label>
      <label className="min-w-48 flex-1 text-sm">
        <span className="mb-1 block text-xs font-semibold text-muted">Note (optional)</span>
        <input name="note" maxLength={500} className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm" placeholder={audience === "seller" ? "e.g. Tracking number DHL 123…" : "e.g. Proof looks great"} />
      </label>
      <button disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-navy">{pending && <Loader2 className="h-4 w-4 animate-spin" />}Save</button>
      {state && (state.ok ? <p className="w-full text-sm text-success">{state.message}</p> : <p className="w-full text-sm text-danger" role="alert">{state.error}</p>)}
    </form>
  );
}
