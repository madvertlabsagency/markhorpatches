"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, Lock, MailCheck, Pencil, Send, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { PATCH_TYPES, INTENDED_USES, BACKINGS, BORDERS, SHAPES, SPECIAL_FINISHES, COUNTRIES, US_STATES, labelFor, patchTypeName, countryName, type PatchTypeCode } from "@/lib/catalog";
import { WIZARD_STEPS, CONSENT_TEXT, sharingText } from "@/lib/rfq/schema";
import { submitRfqAction, askConciergeAction, trackRfqStartedAction, type SubmitResult } from "@/app/actions/rfq";
import { PatchArt } from "@/components/brand/PatchArt";
import { FileUploader, type UploadedFile } from "@/components/forms/FileUploader";
import { ChoiceCard, Field, Input, Select, Textarea, Checkbox } from "@/components/ui/fields";
import { Button } from "@/components/ui/Button";
import { trackClient } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

type Data = Record<string, unknown> & {
  patchType?: string;
  intendedUse?: string;
  unit: string;
  specialFinishing: string[];
  artwork: UploadedFile[];
};

const DRAFT_KEY = "pm_rfq_draft_v1";
// Contact details and consent are deliberately NOT persisted in the browser draft.
const NON_DRAFT = ["contactName", "contactCompany", "contactEmail", "contactPhone", "contactWebsite", "consentMatching", "consentSharing", "consentTerms", "consentMarketing", "artwork"];

const TIPS: Record<string, string> = {
  type: "Not sure which construction suits your design? Pick “Not sure” — manufacturers will recommend one.",
  use: "Intended use helps us match manufacturers who regularly produce for that market.",
  size: "Measure the longest width and height. Most hat patches are 2–3.5 in wide; jacket back patches 8–12 in.",
  quantity: "Many manufacturers offer better unit prices at higher volumes. Tell us if you'll re-order.",
  backing: "Iron-on suits most cotton apparel; hook-and-loop is popular for uniforms and gear.",
  artwork: "Vector PDF or SVG gives the most accurate quotes. Originals are never public — manufacturers see a blurred preview until they're approved.",
  shipping: "We only show your state/region to manufacturers before unlock — never your full address.",
  budget: "Optional. A target helps manufacturers suggest options that fit, and avoids mismatched quotes.",
  intent: "Honest timing helps manufacturers prioritise. It never limits who can quote.",
  contact: "Your contact details stay hidden from manufacturers. On the next step you decide whether anyone may see them.",
  privacy: "Private by default. Manufacturers can always reach you through PatchMatch messaging; direct sharing is your choice.",
  review: "Check everything, then confirm and submit.",
};

export function RfqWizard({ initialType, initialQty, prefill, signedInEmail, sharedEnabled = false, leadSource = "marketplace" }: { initialType?: string; initialQty?: string; prefill?: Record<string, string> | null; signedInEmail?: string | null; sharedEnabled?: boolean; leadSource?: string }) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [pending, startTransition] = useTransition();
  const topRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const [data, setData] = useState<Data>(() => ({
    unit: "IN",
    specialFinishing: [],
    artwork: [],
    destinationCountry: "US",
    preferredContact: "EMAIL",
    disclosureMode: "PLATFORM_MESSAGING_ONLY",
    consentDirectContact: false,
    artworkHelpRequested: false,
    maxRecipients: 1,
    leadSource,
    repeatPotential: false,
    sampleRequired: false,
    rush: false,
    sampleBeforeProduction: false,
    budgetUndisclosed: false,
    consentMarketing: false,
    ...(initialType && PATCH_TYPES.some((p) => p.code === initialType) ? { patchType: initialType } : initialType === "NOT_SURE" ? { patchType: "NOT_SURE" } : {}),
    ...(initialQty && /^\d+$/.test(initialQty) ? { quantity: initialQty } : {}),
    ...(prefill ?? {}),
  }));

  // Restore a non-sensitive draft (patch specs only) from this browser session.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw && !initialType) {
        const draft = JSON.parse(raw) as Partial<Data>;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from browser storage
        setData((d) => ({ ...d, ...draft }));
      }
    } catch {}
  }, [initialType]);
  useEffect(() => {
    try {
      const draft = Object.fromEntries(Object.entries(data).filter(([k]) => !NON_DRAFT.includes(k)));
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [data]);

  const set = (patch: Partial<Data>) => {
    setData((d) => ({ ...d, ...patch }));
    setErrors((e) => {
      const n = { ...e };
      for (const k of Object.keys(patch)) delete n[k];
      return n;
    });
    if (!started.current) {
      started.current = true;
      void trackRfqStartedAction(String(patch.patchType ?? data.patchType ?? "unknown"));
      trackClient("RFQStarted");
    }
  };

  const payload = useMemo(() => ({ ...data, artworkIds: data.artwork.map((a) => a.id) }), [data]);

  const validate = (i: number) => {
    const r = WIZARD_STEPS[i].schema.safeParse(payload);
    if (r.success) return true;
    const e: Record<string, string> = {};
    for (const iss of r.error.issues) e[String(iss.path[0] ?? "form")] ??= iss.message;
    setErrors(e);
    return false;
  };

  const go = (to: number) => {
    setStep(to);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
  };
  const next = () => validate(step) && go(step + 1);
  const back = () => go(Math.max(0, step - 1));

  const submit = () => {
    if (!validate(step)) return;
    startTransition(async () => {
      const r = await submitRfqAction(payload);
      if (r.ok) {
        try {
          sessionStorage.removeItem(DRAFT_KEY);
        } catch {}
        trackClient("RFQSubmitted", { patch_type: String(data.patchType) });
      } else {
        if (r.fieldErrors) setErrors(r.fieldErrors);
        if (r.step !== undefined && r.step !== step) go(r.step);
      }
      setResult(r);
    });
  };

  if (result?.ok) return <Confirmation result={result} email={String(data.contactEmail ?? "")} signedInEmail={signedInEmail} />;

  const current = WIZARD_STEPS[step];
  const pct = Math.round(((step + 1) / WIZARD_STEPS.length) * 100);
  const err = (k: string) => errors[k];

  return (
    <div ref={topRef} className="grid scroll-mt-24 gap-8 lg:grid-cols-[260px_1fr]">
      {/* Progress rail */}
      <aside className="hidden lg:block">
        <ol className="sticky top-24 space-y-1" aria-label="Request steps">
          {WIZARD_STEPS.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                disabled={i > step}
                onClick={() => go(i)}
                className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition", i === step ? "bg-surface font-semibold shadow-[var(--shadow-card)]" : i < step ? "text-fg hover:bg-surface/70" : "text-muted")}
                aria-current={i === step ? "step" : undefined}
              >
                <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold", i < step ? "bg-success text-white" : i === step ? "bg-electric text-[var(--pm-primary-fg)]" : "border border-line")}>
                  {i < step ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>
                {s.title}
              </button>
            </li>
          ))}
        </ol>
      </aside>

      <div className="min-w-0">
        {/* Mobile progress */}
        <div className="mb-5 lg:hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-muted">
            <span>
              Step {step + 1} of {WIZARD_STEPS.length}
            </span>
            <span>{current.title}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Request progress">
            <div className="h-full rounded-full bg-electric transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-line px-5 py-5 sm:px-8">
            <p className="eyebrow">
              Step {step + 1} · {current.title}
            </p>
            <h2 className="mt-1.5 text-xl font-semibold sm:text-2xl">{HEADINGS[current.key]}</h2>
            <p className="mt-1.5 flex items-start gap-2 text-sm text-muted">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-electric" /> {TIPS[current.key]}
            </p>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} initial={reduce ? false : { opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0, x: -16 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="px-5 py-6 sm:px-8 sm:py-8">
              {current.key === "type" && <StepType data={data} set={set} error={err("patchType")} />}
              {current.key === "type" && (
                <div className="mt-8 space-y-4">
                  <p className="text-sm font-semibold">How will the patches be used?</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Intended use">
                    {INTENDED_USES.map((u) => (
                      <ChoiceCard key={u.code} selected={data.intendedUse === u.code} onSelect={() => set({ intendedUse: u.code })} title={u.label} description={u.blurb} />
                    ))}
                  </div>
                  {data.intendedUse === "OTHER" && (
                    <Field id="intendedUseOther" label="Tell us more" optional>
                      <Input id="intendedUseOther" value={String(data.intendedUseOther ?? "")} onChange={(e) => set({ intendedUseOther: e.target.value })} maxLength={120} />
                    </Field>
                  )}
                  {err("intendedUse") && <p className="text-sm font-medium text-danger" role="alert">{err("intendedUse")}</p>}
                </div>
              )}
              {current.key === "size" && <StepSize data={data} set={set} err={err} />}
              {current.key === "quantity" && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="quantity" label="Estimated quantity" error={err("quantity")}>
                    <Input id="quantity" inputMode="numeric" className="tabular" value={String(data.quantity ?? "")} onChange={(e) => set({ quantity: e.target.value.replace(/\D/g, "") })} aria-invalid={!!err("quantity")} placeholder="e.g. 500" />
                  </Field>
                  <Field id="minQuantity" label="Minimum acceptable quantity" optional hint="Lowest run you'd consider" error={err("minQuantity")}>
                    <Input id="minQuantity" inputMode="numeric" className="tabular" value={String(data.minQuantity ?? "")} onChange={(e) => set({ minQuantity: e.target.value.replace(/\D/g, "") })} aria-invalid={!!err("minQuantity")} />
                  </Field>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    {[50, 100, 250, 500, 1000, 5000].map((n) => (
                      <button key={n} type="button" onClick={() => set({ quantity: String(n) })} className={cn("tabular rounded-full border px-3.5 py-1.5 text-sm font-semibold transition", String(data.quantity) === String(n) ? "border-electric bg-electric/10 text-electric" : "border-line hover:border-electric/40")}>
                        {n.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <Checkbox id="repeatPotential" checked={!!data.repeatPotential} onChange={(e) => set({ repeatPotential: e.target.checked })} label="Likely to re-order" description="Repeat orders help manufacturers offer better pricing." />
                  <Checkbox id="sampleRequired" checked={!!data.sampleRequired} onChange={(e) => set({ sampleRequired: e.target.checked })} label="I need a physical sample first" />
                </div>
              )}
              {current.key === "backing" && (
                <div className="space-y-6">
                  <div>
                    <p className="mb-2 text-sm font-medium">Backing</p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Backing">
                      {BACKINGS.map((b) => (
                        <ChoiceCard key={b.code} selected={data.backing === b.code} onSelect={() => set({ backing: b.code })} title={b.label} description={b.hint} />
                      ))}
                    </div>
                    {data.backing === "OTHER" && <Input className="mt-3" placeholder="Describe the backing" value={String(data.backingOther ?? "")} onChange={(e) => set({ backingOther: e.target.value })} aria-label="Other backing" maxLength={80} />}
                  </div>
                  <Field id="colorCount" label="Number of colours" optional hint="Leave blank for full-colour / photographic designs." error={err("colorCount")}>
                    <Input id="colorCount" inputMode="numeric" className="tabular max-w-40" value={String(data.colorCount ?? "")} onChange={(e) => set({ colorCount: e.target.value.replace(/\D/g, "") })} />
                  </Field>
                  <div>
                    <p className="mb-2 text-sm font-medium">
                      Special finishing <span className="font-normal text-muted">(optional)</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SPECIAL_FINISHES.map((f) => {
                        const on = data.specialFinishing.includes(f);
                        return (
                          <button key={f} type="button" aria-pressed={on} onClick={() => set({ specialFinishing: on ? data.specialFinishing.filter((x) => x !== f) : [...data.specialFinishing, f] })} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition", on ? "border-electric bg-electric/10 text-electric" : "border-line hover:border-electric/40")}>
                            {on && <Check className="mr-1 inline h-3.5 w-3.5" />}
                            {f}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              {current.key === "artwork" && (
                <div className="space-y-5">
                  <FileUploader purpose="RFQ_ARTWORK" value={data.artwork} onChange={(artwork) => set({ artwork })} label="Drop your logo or design here" />
                  <Field id="artworkNotes" label="Artwork notes" optional hint="Colours (Pantone if known), placement, anything manufacturers should know." error={err("artworkNotes")}>
                    <Textarea id="artworkNotes" rows={4} value={String(data.artworkNotes ?? "")} onChange={(e) => set({ artworkNotes: e.target.value })} maxLength={2000} />
                  </Field>
                  <Checkbox id="artworkHelpRequested" checked={!!data.artworkHelpRequested} onChange={(e) => set({ artworkHelpRequested: e.target.checked })} label="I need help with artwork" description="Manufacturers can digitise a sketch or rough logo — say so in your notes." />
                  {data.artwork.length === 0 && <p className="rounded-xl bg-warning/10 px-3 py-2 text-sm text-fg">No artwork yet? You can continue — but requests with artwork get far more accurate quotes.</p>}
                </div>
              )}
              {current.key === "shipping" && <StepShipping data={data} set={set} err={err} />}
              {current.key === "budget" && (
                <div className="space-y-5">
                  <Checkbox id="budgetUndisclosed" checked={!!data.budgetUndisclosed} onChange={(e) => set({ budgetUndisclosed: e.target.checked })} label="I prefer not to disclose a budget" />
                  {!data.budgetUndisclosed && (
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field id="budgetTotal" label="Estimated total budget (USD)" optional error={err("budgetTotal")}>
                        <div className="relative">
                          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">$</span>
                          <Input id="budgetTotal" inputMode="decimal" className="tabular pl-7" value={String(data.budgetTotal ?? "")} onChange={(e) => set({ budgetTotal: e.target.value.replace(/[^\d.]/g, "") })} />
                        </div>
                      </Field>
                      <Field id="targetUnit" label="Target cost per patch (USD)" optional error={err("targetUnit")}>
                        <div className="relative">
                          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">$</span>
                          <Input id="targetUnit" inputMode="decimal" className="tabular pl-7" value={String(data.targetUnit ?? "")} onChange={(e) => set({ targetUnit: e.target.value.replace(/[^\d.]/g, "") })} />
                        </div>
                      </Field>
                      <div className="sm:col-span-2">
                        <p className="mb-2 text-sm font-medium">Budget flexibility</p>
                        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Budget flexibility">
                          {[
                            ["FIRM", "Firm", "Must stay within budget"],
                            ["SOMEWHAT_FLEXIBLE", "Somewhat flexible", "Can stretch for quality"],
                            ["FLEXIBLE", "Flexible", "Quality and timing first"],
                          ].map(([v, t, d]) => (
                            <ChoiceCard key={v} selected={data.budgetFlexibility === v} onSelect={() => set({ budgetFlexibility: v })} title={t} description={d} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {current.key === "intent" && (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Buying stage">
                    {BUYING_STAGES.map((b) => (
                      <ChoiceCard key={b.code} selected={data.buyingStage === b.code} onSelect={() => set({ buyingStage: b.code })} title={b.label} description={b.hint} />
                    ))}
                  </div>
                  {err("buyingStage") && <p className="text-sm font-medium text-danger" role="alert">{err("buyingStage")}</p>}
                </div>
              )}
              {current.key === "contact" && <StepContact data={data} set={set} err={err} signedInEmail={signedInEmail} />}
              {current.key === "privacy" && <StepPrivacy data={data} set={set} err={err} sharedEnabled={sharedEnabled && leadSource === "marketplace"} single={leadSource !== "marketplace"} />}
              {current.key === "review" && <StepReview data={data} set={set} err={err} goTo={go} sharedEnabled={sharedEnabled && leadSource === "marketplace"} />}
            </motion.div>
          </AnimatePresence>

          {result && !result.ok && (
            <p className="mx-5 mb-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger sm:mx-8" role="alert">
              {result.error}
            </p>
          )}

          <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-surface/95 px-5 py-4 backdrop-blur sm:px-8">
            <Button type="button" variant="ghost" onClick={back} disabled={step === 0 || pending}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {step < WIZARD_STEPS.length - 1 ? (
              <Button type="button" onClick={next}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={submit} loading={pending}>
                <Send className="h-4 w-4" /> Submit request
              </Button>
            )}
          </div>
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <Lock className="h-3.5 w-3.5" /> Free for buyers · Your details are never shown publicly
        </p>
      </div>
    </div>
  );
}

const HEADINGS: Record<string, string> = {
  type: "What kind of patch do you need?",
  use: "How will the patches be used?",
  size: "What size and shape?",
  quantity: "How many patches?",
  backing: "Backing and construction",
  artwork: "Upload your artwork",
  shipping: "When and where?",
  budget: "Do you have a budget in mind?",
  intent: "Where are you in your buying process?",
  contact: "Your contact details",
  privacy: "Who may see your contact details?",
  review: "Review and submit",
};

type SetFn = (patch: Partial<Data>) => void;

function StepType({ data, set, error }: { data: Data; set: SetFn; error?: string }) {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<{ text: string; rec: string } | null>(null);
  const [asking, startAsk] = useTransition();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Patch type">
        {PATCH_TYPES.map((p, i) => {
          const sel = data.patchType === p.code;
          return (
            <button
              key={p.code}
              type="button"
              role="radio"
              aria-checked={sel}
              onClick={() => set({ patchType: p.code })}
              className={cn("group rounded-2xl border bg-surface p-3 text-left transition", sel ? "border-electric shadow-[0_0_0_3px_rgb(0_180_255/0.15)]" : "border-line hover:border-electric/40")}
            >
              <div className="mx-auto w-20 transition group-hover:scale-105">
                <PatchArt type={p.code} shape={(["shield", "circle", "rounded"] as const)[i % 3]} />
              </div>
              <p className="mt-2 text-sm font-semibold">{p.name.replace(" patches", "")}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted">{p.short}</p>
            </button>
          );
        })}
        <button type="button" role="radio" aria-checked={data.patchType === "NOT_SURE"} onClick={() => set({ patchType: "NOT_SURE" })} className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed p-3 text-center transition", data.patchType === "NOT_SURE" ? "border-electric bg-electric/5" : "border-line hover:border-electric/40")}>
          <Wand2 className="h-8 w-8 text-electric" />
          <p className="mt-2 text-sm font-semibold">Not sure</p>
          <p className="mt-0.5 text-xs text-muted">Get recommendations</p>
        </button>
      </div>
      {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}

      <div className="rounded-2xl border border-line bg-surface-2/50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-electric" /> Ask the patch concierge
        </p>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            startAsk(async () => {
              const r = await askConciergeAction(q);
              setAnswer(r.ok ? { text: r.answer, rec: r.recommended } : { text: r.error, rec: "NONE" });
            });
          }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. What's best for a detailed logo on caps?" aria-label="Question for the patch concierge" maxLength={600} />
          <Button type="submit" variant="secondary" loading={asking} disabled={q.trim().length < 3}>
            Ask
          </Button>
        </form>
        {answer && (
          <div className="mt-3 rounded-xl bg-surface p-3 text-sm leading-relaxed text-muted" aria-live="polite">
            {answer.text}
            {answer.rec !== "NONE" && answer.rec !== data.patchType && (
              <button type="button" onClick={() => set({ patchType: answer.rec })} className="mt-2 block font-semibold text-electric hover:underline">
                Choose {patchTypeName(answer.rec)} →
              </button>
            )}
            <p className="mt-2 text-[11px]">Automated guidance — manufacturers confirm feasibility and pricing in their quotes.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StepSize({ data, set, err }: { data: Data; set: SetFn; err: (k: string) => string | undefined }) {
  const w = Number(data.width) || 0;
  const h = Number(data.height) || 0;
  const scale = Math.min(1, 120 / Math.max(w, h, 1));
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_200px]">
      <div className="space-y-5">
        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
          <Field id="width" label="Width" error={err("width")}>
            <Input id="width" inputMode="decimal" className="tabular" value={String(data.width ?? "")} onChange={(e) => set({ width: e.target.value.replace(/[^\d.]/g, "") })} placeholder="3" />
          </Field>
          <Field id="height" label="Height" error={err("height")}>
            <Input id="height" inputMode="decimal" className="tabular" value={String(data.height ?? "")} onChange={(e) => set({ height: e.target.value.replace(/[^\d.]/g, "") })} placeholder="3" />
          </Field>
          <div>
            <label className="sr-only" htmlFor="unit">
              Unit
            </label>
            <Select id="unit" value={data.unit} onChange={(e) => set({ unit: e.target.value })} className="w-24">
              <option value="IN">in</option>
              <option value="CM">cm</option>
              <option value="MM">mm</option>
            </Select>
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Shape</p>
          <div className="flex flex-wrap gap-2">
            {SHAPES.map((s) => (
              <button key={s} type="button" aria-pressed={data.shape === s} onClick={() => set({ shape: s })} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition", data.shape === s ? "border-electric bg-electric/10 text-electric" : "border-line hover:border-electric/40")}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field id="borderType" label="Border" optional>
            <Select id="borderType" value={String(data.borderType ?? "")} onChange={(e) => set({ borderType: e.target.value || undefined })}>
              <option value="">Select…</option>
              {BORDERS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="material" label="Material" optional>
            <Input id="material" value={String(data.material ?? "")} onChange={(e) => set({ material: e.target.value })} placeholder="e.g. twill" maxLength={80} />
          </Field>
          <Field id="thickness" label="Thickness" optional>
            <Input id="thickness" value={String(data.thickness ?? "")} onChange={(e) => set({ thickness: e.target.value })} placeholder="e.g. 3mm" maxLength={40} />
          </Field>
        </div>
      </div>
      <div className="grid place-items-center rounded-2xl border border-line bg-[repeating-linear-gradient(0deg,transparent,transparent_19px,var(--pm-line)_20px),repeating-linear-gradient(90deg,transparent,transparent_19px,var(--pm-line)_20px)] p-4" aria-hidden>
        {w > 0 && h > 0 ? (
          <div className="flex flex-col items-center gap-2">
            <div className="grid place-items-center border-2 border-dashed border-electric bg-electric/10 text-xs font-semibold text-electric" style={{ width: w * scale * (100 / Math.max(w, h)), height: h * scale * (100 / Math.max(w, h)), borderRadius: data.shape === "Circle" ? "999px" : data.shape === "Oval" ? "50%" : 12 }}>
              {w}×{h}
            </div>
            <span className="text-xs text-muted">{String(data.unit).toLowerCase()}</span>
          </div>
        ) : (
          <span className="text-xs text-muted">Size preview</span>
        )}
      </div>
    </div>
  );
}

function StepShipping({ data, set, err }: { data: Data; set: SetFn; err: (k: string) => string | undefined }) {
  const today = new Date();
  today.setDate(today.getDate() + 3);
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field id="destinationCountry" label="Destination country" error={err("destinationCountry")}>
        <Select id="destinationCountry" value={String(data.destinationCountry ?? "US")} onChange={(e) => set({ destinationCountry: e.target.value, destinationState: undefined })}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="destinationState" label={data.destinationCountry === "US" ? "State" : "State / region"} optional>
        {data.destinationCountry === "US" ? (
          <Select id="destinationState" value={String(data.destinationState ?? "")} onChange={(e) => set({ destinationState: e.target.value || undefined })}>
            <option value="">Select…</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        ) : (
          <Input id="destinationState" value={String(data.destinationState ?? "")} onChange={(e) => set({ destinationState: e.target.value })} maxLength={60} />
        )}
      </Field>
      <Field id="destinationPostal" label={data.destinationCountry === "US" ? "ZIP code" : "Postal code"} optional hint="Only shared after a manufacturer is approved." error={err("destinationPostal")}>
        <Input id="destinationPostal" value={String(data.destinationPostal ?? "")} onChange={(e) => set({ destinationPostal: e.target.value })} maxLength={16} autoComplete="postal-code" />
      </Field>
      <Field id="requiredBy" label="Required delivery date" optional error={err("requiredBy")}>
        <Input id="requiredBy" type="date" min={today.toISOString().slice(0, 10)} value={String(data.requiredBy ?? "")} onChange={(e) => set({ requiredBy: e.target.value })} />
      </Field>
      <div className="sm:col-span-2">
        <p className="mb-2 text-sm font-medium">How flexible is the date? <span className="font-normal text-muted">(optional)</span></p>
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Delivery flexibility">
          {[["FIXED", "Fixed date", "Must arrive by then"], ["ONE_WEEK", "± 1 week", "A few days either way is fine"], ["FLEXIBLE", "Flexible", "Quality first"]].map(([v, t, d]) => (
            <ChoiceCard key={v} selected={data.deliveryFlexibility === v} onSelect={() => set({ deliveryFlexibility: v })} title={t} description={d} />
          ))}
        </div>
      </div>
      <Checkbox id="rush" checked={!!data.rush} onChange={(e) => set({ rush: e.target.checked })} label="This is a rush order" description="We'll prioritise manufacturers with rush capacity." />
      <Checkbox id="sampleBeforeProduction" checked={!!data.sampleBeforeProduction} onChange={(e) => set({ sampleBeforeProduction: e.target.checked })} label="I want to approve a sample before production" />
    </div>
  );
}

function StepContact({ data, set, err, signedInEmail }: { data: Data; set: SetFn; err: (k: string) => string | undefined; signedInEmail?: string | null }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field id="contactName" label="Full name" error={err("contactName")}>
        <Input id="contactName" autoComplete="name" value={String(data.contactName ?? "")} onChange={(e) => set({ contactName: e.target.value })} aria-invalid={!!err("contactName")} />
      </Field>
      <Field id="contactCompany" label="Company" optional>
        <Input id="contactCompany" autoComplete="organization" value={String(data.contactCompany ?? "")} onChange={(e) => set({ contactCompany: e.target.value })} />
      </Field>
      <Field id="contactEmail" label="Email" error={err("contactEmail")} hint={signedInEmail && data.contactEmail === signedInEmail ? "Using your verified account email — no extra confirmation needed." : "We'll send a confirmation link to verify this address."}>
        <Input id="contactEmail" type="email" autoComplete="email" value={String(data.contactEmail ?? "")} onChange={(e) => set({ contactEmail: e.target.value })} aria-invalid={!!err("contactEmail")} />
      </Field>
      <Field id="contactPhone" label="Phone" optional error={err("contactPhone")}>
        <Input id="contactPhone" type="tel" autoComplete="tel" value={String(data.contactPhone ?? "")} onChange={(e) => set({ contactPhone: e.target.value })} />
      </Field>
      <Field id="contactWebsite" label="Website" optional error={err("contactWebsite")}>
        <Input id="contactWebsite" autoComplete="url" value={String(data.contactWebsite ?? "")} onChange={(e) => set({ contactWebsite: e.target.value })} placeholder="yourbrand.com" />
      </Field>
      <Field id="preferredContact" label="Preferred contact method">
        <Select id="preferredContact" value={String(data.preferredContact ?? "EMAIL")} onChange={(e) => set({ preferredContact: e.target.value })}>
          <option value="EMAIL">Email</option>
          <option value="PHONE">Phone</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="PLATFORM">PatchMatch messaging</option>
        </Select>
      </Field>
      {/* Honeypot */}
      <div className="hidden" aria-hidden>
        <label htmlFor="website2">Leave empty</label>
        <input id="website2" tabIndex={-1} autoComplete="off" value={String(data.website2 ?? "")} onChange={(e) => set({ website2: e.target.value })} />
      </div>
    </div>
  );
}

type PrivacyMode = "PLATFORM_MESSAGING_ONLY" | "BUYER_SELECTED" | "FULL_CONTACT";
const PRIVACY_OPTIONS: { code: PrivacyMode; letter: string; title: string; description: string }[] = [
  { code: "PLATFORM_MESSAGING_ONLY", letter: "A", title: "Keep my contact details private", description: "Receive quotations and messages through PatchMatch. Manufacturers never see your email, phone or company." },
  { code: "BUYER_SELECTED", letter: "B", title: "Share only with manufacturers I select", description: "Everyone talks to you on PatchMatch first. You choose, manufacturer by manufacturer, who gets your direct contact details." },
  { code: "FULL_CONTACT", letter: "C", title: "Let matched manufacturers contact me directly", description: "Verified manufacturers who take your request (up to the number you allow) receive your name, company, email, phone and website." },
];
const BUYING_STAGES = [
  { code: "READY_7_DAYS", label: "Ready to order within 7 days", hint: "Artwork and budget are ready — I want quotes now." },
  { code: "WITHIN_30_DAYS", label: "Planning to order within 30 days", hint: "Finalising details; ordering soon." },
  { code: "COMPARING", label: "Comparing manufacturers", hint: "Collecting quotes to compare options." },
  { code: "RESEARCHING", label: "Researching for later", hint: "Exploring prices and options for a future order." },
];

function StepPrivacy({ data, set, err, sharedEnabled, single }: { data: Data; set: SetFn; err: (k: string) => string | undefined; sharedEnabled: boolean; single: boolean }) {
  const mode = (data.disclosureMode as PrivacyMode) ?? "PLATFORM_MESSAGING_ONLY";
  const max = sharedEnabled && Number(data.maxRecipients) === 3 ? 3 : 1;
  return (
    <div className="space-y-7">
      <div className="grid gap-3" role="radiogroup" aria-label="Contact privacy">
        {PRIVACY_OPTIONS.map((o) => (
          <ChoiceCard key={o.code} selected={mode === o.code} onSelect={() => set({ disclosureMode: o.code, consentDirectContact: o.code === "PLATFORM_MESSAGING_ONLY" ? false : data.consentDirectContact })} title={`${o.letter}. ${o.title}${o.code === "PLATFORM_MESSAGING_ONLY" ? " (recommended)" : ""}`} description={o.description} />
        ))}
      </div>
      {mode !== "PLATFORM_MESSAGING_ONLY" && (
        <div className="rounded-2xl border border-warning/40 bg-warning/8 p-4">
          <Checkbox
            id="consentDirectContact"
            checked={!!data.consentDirectContact}
            onChange={(e) => set({ consentDirectContact: e.target.checked })}
            label="I agree to share my direct contact details as described above"
            description={mode === "BUYER_SELECTED" ? "Only with manufacturers I approve, one at a time, from my dashboard. I can stop sharing for future manufacturers at any time." : `With up to ${max} verified manufacturer(s) who purchase access to this request. Already-shared details can't be recalled, but I can switch to private for anyone else.`}
          />
          {err("consentDirectContact") && <p className="mt-2 text-sm text-danger" role="alert">{err("consentDirectContact")}</p>}
        </div>
      )}
      {sharedEnabled && (
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-semibold">How many manufacturers may take your request?</legend>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
            <ChoiceCard selected={max === 1} onSelect={() => set({ maxRecipients: 1 })} title="One manufacturer (exclusive)" description="Only the first verified manufacturer to claim your request receives it." />
            <ChoiceCard selected={max === 3} onSelect={() => set({ maxRecipients: 3 })} title="Up to 3 manufacturers" description="Up to three competing quotes. Never more than three manufacturers." />
          </div>
        </fieldset>
      )}
      {single && <p className="rounded-xl border border-line bg-surface-2/40 px-4 py-3 text-sm text-muted">Your request goes to <strong className="text-fg">one</strong> verified manufacturing partner, who sends you a quote.</p>}
      <p className="text-xs text-muted">You can change this later from your dashboard. A manufacturer's purchase never overrides your choice.</p>
    </div>
  );
}

function StepReview({ data, set, err, goTo, sharedEnabled }: { data: Data; set: SetFn; err: (k: string) => string | undefined; goTo: (i: number) => void; sharedEnabled: boolean; single?: boolean }) {
  const mode = (data.disclosureMode as PrivacyMode) ?? "PLATFORM_MESSAGING_ONLY";
  const max = sharedEnabled && Number(data.maxRecipients) === 3 ? 3 : 1;
  const rows: { step: number; label: string; value: string }[] = [
    { step: 0, label: "Patch type", value: `${patchTypeName(String(data.patchType))} · ${labelFor(INTENDED_USES, String(data.intendedUse))}${data.intendedUseOther ? ` — ${data.intendedUseOther}` : ""}` },
    { step: 1, label: "Quantity", value: `${Number(data.quantity).toLocaleString()}${data.minQuantity ? ` (min ${data.minQuantity})` : ""}${data.repeatPotential ? " · repeat orders likely" : ""}${data.sampleRequired ? " · sample needed" : ""}` },
    { step: 2, label: "Size", value: data.width && data.height ? `${data.width} × ${data.height} ${String(data.unit).toLowerCase()}${data.shape ? `, ${data.shape}` : ""}${data.borderType ? `, ${labelFor(BORDERS, String(data.borderType))}` : ""}` : "Not specified" },
    { step: 3, label: "Artwork", value: (data.artwork.length ? data.artwork.map((a) => a.filename).join(", ") : "None uploaded") + (data.artworkHelpRequested ? " · artwork help requested" : "") },
    { step: 4, label: "Backing", value: `${labelFor(BACKINGS, String(data.backing ?? ""))}${data.colorCount ? ` · ${data.colorCount} colours` : ""}${data.specialFinishing.length ? ` · ${data.specialFinishing.join(", ")}` : ""}` },
    { step: 5, label: "Budget", value: data.budgetUndisclosed ? "Prefer not to disclose" : [data.budgetTotal && `$${data.budgetTotal} total`, data.targetUnit && `$${data.targetUnit}/patch`].filter(Boolean).join(" · ") || "Not specified" },
    { step: 6, label: "Delivery", value: `${[data.destinationState, countryName(String(data.destinationCountry))].filter(Boolean).join(", ")}${data.destinationPostal ? ` ${data.destinationPostal}` : ""}${data.requiredBy ? ` · by ${data.requiredBy}` : ""}${data.rush ? " · rush" : ""}` },
    { step: 7, label: "Buying stage", value: BUYING_STAGES.find((b) => b.code === data.buyingStage)?.label ?? "—" },
    { step: 8, label: "Contact", value: [data.contactName, data.contactCompany, data.contactEmail, data.contactPhone].filter(Boolean).join(" · ") },
    { step: 9, label: "Privacy", value: `${PRIVACY_OPTIONS.find((o) => o.code === mode)?.title ?? ""}${max > 1 ? " · up to 3 manufacturers" : " · one manufacturer"}` },
  ];
  return (
    <div className="space-y-7">
      <dl className="divide-y divide-line rounded-2xl border border-line">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-3 px-4 py-3">
            <dt className="w-24 shrink-0 text-xs font-semibold tracking-wide text-muted uppercase sm:w-28">{r.label}</dt>
            <dd className="min-w-0 flex-1 text-sm break-words">{r.value}</dd>
            <button type="button" onClick={() => goTo(r.step)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-electric" aria-label={`Edit ${r.label}`}>
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </dl>
      <div className="rounded-2xl border border-line bg-surface-2/40 p-4 text-sm">
        <p className="font-semibold">What happens next</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
          <li>Confirm your email (we send a link) and tell us you still want quotes.</li>
          <li>Our team reviews your request, then matches it with suitable verified manufacturers.</li>
          <li>Manufacturers who take your request send itemised quotes and message you on PatchMatch.</li>
          <li>Compare, ask questions, and choose — or decline. Free, with no obligation to order.</li>
        </ol>
      </div>

      <fieldset className="space-y-4 rounded-2xl border border-line bg-surface-2/40 p-4">
        <legend className="sr-only">Consent</legend>
        <Checkbox id="consentMatching" checked={!!data.consentMatching} onChange={(e) => set({ consentMatching: e.target.checked || undefined })} label="Supplier matching" description={CONSENT_TEXT.SUPPLIER_MATCHING} />
        {err("consentMatching") && <p className="text-sm text-danger" role="alert">{err("consentMatching")}</p>}
        <Checkbox id="consentSharing" checked={!!data.consentSharing} onChange={(e) => set({ consentSharing: e.target.checked || undefined })} label="How my information is shared" description={sharingText(mode, max)} />
        {err("consentSharing") && <p className="text-sm text-danger" role="alert">{err("consentSharing")}</p>}
        <Checkbox
          id="consentTerms"
          checked={!!data.consentTerms}
          onChange={(e) => set({ consentTerms: e.target.checked || undefined })}
          label={
            <>
              I agree to the{" "}
              <Link href="/buyer-terms" target="_blank" className="text-electric underline">
                Buyer Terms
              </Link>
              ,{" "}
              <Link href="/privacy" target="_blank" className="text-electric underline">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/data-sharing-policy" target="_blank" className="text-electric underline">
                Data Sharing Policy
              </Link>
              .
            </>
          }
        />
        {err("consentTerms") && <p className="text-sm text-danger" role="alert">{err("consentTerms")}</p>}
        <div className="border-t border-line pt-4">
          <Checkbox id="consentMarketing" checked={!!data.consentMarketing} onChange={(e) => set({ consentMarketing: e.target.checked })} label="Marketing emails (optional)" description={CONSENT_TEXT.MARKETING} />
        </div>
      </fieldset>
      <p className="flex items-start gap-2 text-xs text-muted">
        <ShieldCheck className="h-4 w-4 shrink-0 text-success" /> A request is a buying enquiry — you're under no obligation to accept any quote.
      </p>
    </div>
  );
}

function Confirmation({ result, email, signedInEmail }: { result: Extract<SubmitResult, { ok: true }>; email: string; signedInEmail?: string | null }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card mx-auto max-w-2xl overflow-hidden">
      <div className="relative overflow-hidden bg-navy px-8 py-10 text-center text-white">
        <div className="grid-bg-dark absolute inset-0" aria-hidden />
        <div className="relative">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-success/20 text-emerald-300">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-2xl font-semibold">Request received</h2>
          <p className="mt-2 text-white/65">Your RFQ ID</p>
          <p className="tabular mt-1 font-display text-3xl font-bold tracking-wider text-cyan">{result.ref}</p>
        </div>
      </div>
      <div className="space-y-6 p-6 sm:p-8">
        {result.verified ? (
          <div className="flex gap-3 rounded-xl border border-success/30 bg-success/5 p-4 text-sm">
            <ShieldCheck className="h-5 w-5 shrink-0 text-success" />
            <p>
              <strong>Verified.</strong> Your account email is already confirmed, so your request is in review now.
            </p>
          </div>
        ) : (
          <div className="flex gap-3 rounded-xl border border-electric/30 bg-electric/5 p-4 text-sm">
            <MailCheck className="h-5 w-5 shrink-0 text-electric" />
            <p>
              <strong>Next: confirm your email.</strong> We sent a link to <span className="font-semibold">{email}</span>. We only review verified requests.
            </p>
          </div>
        )}
        {!result.verified && result.demoVerifyUrl && (
          <div className="rounded-xl border border-warning/40 bg-warning/8 p-4 text-sm">
            <p><strong>Demo mode:</strong> emails are not sent in the demo, so confirm here instead.</p>
            <a href={result.demoVerifyUrl} className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-electric px-4 font-semibold text-[var(--pm-primary-fg)]">
              <MailCheck className="h-4 w-4" /> Verify my request now
            </a>
          </div>
        )}
        <ol className="space-y-3 text-sm">
          {["Email verification", "Our team reviews your request (usually within 1 business day)", "Matching with verified manufacturers", "Quotes arrive — compare and choose"].map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold", i === 0 && result.verified ? "bg-success text-white" : i === 0 || (i === 1 && result.verified) ? "bg-electric text-[var(--pm-primary-fg)]" : "border border-line text-muted")}>{i === 0 && result.verified ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <div className="rounded-xl border border-line p-4">
          <p className="text-sm font-semibold">Tracking link</p>
          <p className="mt-1 text-xs text-muted">Keep this private — it shows your request status without signing in.</p>
          <div className="mt-2 flex gap-2">
            <Input readOnly value={result.trackUrl} aria-label="Tracking link" className="text-xs" />
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(result.trackUrl);
                setCopied(true);
              }}
            >
              <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {signedInEmail ? (
            <Link href={`/buyer/rfqs/${result.rfqId}`} className="inline-flex h-11 items-center rounded-xl bg-electric px-5 font-semibold text-[var(--pm-primary-fg)]">
              View request
            </Link>
          ) : (
            <Link href={`/register?next=${encodeURIComponent("/buyer/rfqs")}`} className="inline-flex h-11 items-center rounded-xl bg-electric px-5 font-semibold text-[var(--pm-primary-fg)]">
              Create an account to track quotes
            </Link>
          )}
          <Link href={new URL(result.trackUrl).pathname + new URL(result.trackUrl).search} className="inline-flex h-11 items-center rounded-xl border border-line px-5 font-semibold">
            Open tracking page
          </Link>
        </div>
      </div>
    </div>
  );
}

export type { PatchTypeCode };
