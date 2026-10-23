"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pause, Play, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/fields";
import { demoControlAction, demoFullResetAction, demoRatesAction, demoSimToggleAction, type DemoOp } from "@/app/admin/demo/actions";
import type { DemoResult } from "@/lib/demo/engine";
import type { DemoSimSettings } from "@/lib/demo/settings";

type Entry = DemoResult & { at: string; label: string };

function useRunner() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<Entry[]>([]);
  const run = (label: string, fn: () => Promise<DemoResult>) => {
    setBusy(label);
    start(async () => {
      const r = await fn().catch((e: Error) => ({ ok: false, message: e.message }) as DemoResult);
      setLog((l) => [{ ...r, label, at: new Date().toLocaleTimeString() }, ...l].slice(0, 12));
      setBusy(null);
      router.refresh();
    });
  };
  return { pending, busy, log, run };
}

const ACTIONS: { op: DemoOp; label: string; hint: string }[] = [
  { op: "buyer", label: "Generate buyer request", hint: "A fictional buyer submits an RFQ through the real pipeline" },
  { op: "manufacturer", label: "Generate manufacturer", hint: "A new application lands in seller verification" },
  { op: "quote", label: "Generate quote", hint: "A manufacturer quotes an unlocked request" },
  { op: "unlock", label: "Simulate unlock", hint: "A manufacturer unlocks the oldest open request (demo credits)" },
  { op: "reply", label: "Simulate buyer reply", hint: "A buyer answers in a conversation" },
  { op: "noResponse", label: "Simulate no response", hint: "Quote → two reminders → request expires" },
  { op: "claim", label: "Simulate quality claim", hint: "Invalid contact claim → admin review → demo credit" },
  { op: "order", label: "Simulate order", hint: "A buyer selects a quote and the project advances" },
  { op: "tick", label: "Run one simulation step", hint: "Process everything the configured rates say is due" },
  { op: "seed10", label: "Seed 10 RFQs", hint: "Adds 10 baseline demo requests" },
  { op: "seed50", label: "Seed 50 RFQs", hint: "Adds 50 baseline demo requests (takes a while)" },
];

export function DemoControlPanel({ settings, presets, scenarios }: { settings: DemoSimSettings; presets: Record<string, { label: string }>; scenarios: Record<string, { title: string; steps: string }> }) {
  const { pending, busy, log, run } = useRunner();
  const [confirmText, setConfirmText] = useState("");
  const rates: [keyof DemoSimSettings, string][] = [["rfqsPerHour", "New RFQs / hour"], ["claimsPerHour", "Unlocks / hour"], ["quotesPerHour", "Quotes / hour"], ["messagesPerHour", "Messages / hour"], ["ordersPerHour", "Orders / hour"], ["applicationsPerHour", "Applications / hour"]];
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <section className="card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-lg font-bold">Simulation</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${settings.enabled ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>{settings.enabled ? "Running" : "Paused"}</span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="success" disabled={pending || settings.enabled} onClick={() => run("Start", () => demoSimToggleAction(true))}><Play className="h-4 w-4" /> Start</Button>
              <Button size="sm" variant="secondary" disabled={pending || !settings.enabled} onClick={() => run("Pause", () => demoSimToggleAction(false))}><Pause className="h-4 w-4" /> Pause</Button>
            </div>
          </div>
          <p className="mt-1 text-sm text-muted">Activity is generated server-side while anyone has a page open (and by <code className="font-mono text-xs">/api/cron/demo</code> if an external scheduler calls it).</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(presets).map(([k, p]) => (
              <Button key={k} size="sm" variant="ghost" disabled={pending} onClick={() => run(`Preset: ${p.label}`, () => demoRatesAction({ preset: k }))}>{p.label}</Button>
            ))}
          </div>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              run("Save rates", () => demoRatesAction(Object.fromEntries(rates.map(([k]) => [k, Number(fd.get(k))]))));
            }}
          >
            {rates.map(([k, label]) => (
              <label key={`${k}-${String(settings[k])}`} className="text-sm">
                <span className="text-muted">{label}</span>
                <Input name={k} type="number" min={0} max={600} defaultValue={String(settings[k])} className="mt-1 tabular" />
              </label>
            ))}
            <div className="sm:col-span-3"><Button size="sm" type="submit" disabled={pending}>Save rates</Button></div>
          </form>
        </section>

        <section className="card p-5">
          <h2 className="font-display text-lg font-bold">Generate activity</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ACTIONS.map((a) => (
              <button key={a.op} type="button" disabled={pending} onClick={() => run(a.label, () => demoControlAction(a.op))} className="rounded-xl border border-line p-3 text-left transition hover:border-electric hover:bg-electric/5 disabled:opacity-50">
                <p className="text-sm font-semibold">{busy === a.label ? "Working…" : a.label}</p>
                <p className="mt-0.5 text-xs text-muted">{a.hint}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-display text-lg font-bold">Scenarios</h2>
          <p className="mt-1 text-sm text-muted">Each run creates a fresh request for the demo buyer and manufacturer, so scenarios can be repeated.</p>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {Object.entries(scenarios).map(([k, s]) => (
              <li key={k} className="flex items-start gap-3 rounded-xl border border-line p-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-navy font-display font-bold text-white">{k}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="text-xs text-muted">{s.steps}</p>
                </div>
                <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(`Scenario ${k}`, () => demoControlAction(`scenario:${k}` as DemoOp))}>{busy === `Scenario ${k}` ? "Running…" : "Run"}</Button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card border-danger/40 p-5">
          <h2 className="font-display text-lg font-bold">Reset</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => window.confirm("Remove everything the simulator and these buttons generated? The seeded baseline stays.") && run("Reset simulated activity", () => demoControlAction("resetSimulated"))}>
              <RotateCcw className="h-4 w-4" /> Reset simulated activity
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Input aria-label="Type RESET to confirm" placeholder="Type RESET" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="w-40" />
            <Button size="sm" variant="danger" disabled={pending || confirmText !== "RESET"} onClick={() => window.confirm("Delete ALL demo data and rebuild the baseline? Demo sessions will be signed out.") && run("Full demo reset", () => demoFullResetAction(confirmText))}>
              Full reset &amp; reseed
            </Button>
            <p className="w-full text-xs text-muted">Deletes every demo record (isDemo only) and rebuilds 20 manufacturers, 12 buyers and ~40 requests. Can take a minute.</p>
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="card p-5">
          <h2 className="font-display text-base font-bold">Result log</h2>
          {log.length === 0 ? <p className="mt-2 text-sm text-muted">Results of the actions you run appear here.</p> : (
            <ul className="mt-3 space-y-3" aria-live="polite">
              {log.map((e, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  {e.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />}
                  <div>
                    <p className="text-xs text-muted">{e.at} · {e.label}</p>
                    <p>{e.message}</p>
                    {e.link && <Link href={e.link} className="text-xs font-semibold text-electric hover:underline">Open →</Link>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
