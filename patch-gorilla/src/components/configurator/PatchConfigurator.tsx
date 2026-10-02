"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Info, MessageCircle, Pencil, ShoppingBag, Sparkles, Bookmark } from "lucide-react";
import type { Shape } from "@/generated/prisma/enums";
import {
  allowedBackings, allowedBorders, allowedExtras, allowedShapes, getPatchType, reconcile, requiresBorder, titleShape, validateConfig,
  type Catalog, type ConfigField, type ConfigState,
} from "@/lib/configurator/rules";
import { quoteConfiguration } from "@/lib/pricing/quote";
import { estimateDelivery } from "@/lib/configurator/delivery";
import type { PriceTable } from "@/lib/pricing/types";
import { formatUSD } from "@/lib/money";
import { formatDate, cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { setWhatsAppContext, whatsappMessage } from "@/lib/client/whatsapp-store";
import { addToCartAction, saveDesignAction, updateCartItemAction } from "@/app/actions/cart";
import { PatchArt } from "@/components/brand/PatchArt";
import { AnimatedPrice } from "@/components/motion/AnimatedPrice";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/fields";
import { useToast } from "@/components/ui/Toast";
import { ArtworkUploader, type UploadedArtwork } from "./ArtworkUploader";
import { ShapeIcon, SizeVisual } from "./ShapeIcon";

type ArtworkMode = "UPLOADED" | "NEEDS_DESIGN_HELP" | "SEND_LATER";
type StepKey = "type" | "artwork" | "size" | "quantity" | "shape" | "backing" | "border" | "extras" | "review";

const STEP_LABEL: Record<StepKey, string> = { type: "Patch type", artwork: "Artwork", size: "Size", quantity: "Quantity", shape: "Shape", backing: "Backing", border: "Border", extras: "Extras", review: "Review" };
const SIZE_PRESETS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5];
const QTY_PRESETS = [10, 25, 50, 100, 200, 300, 500, 1000, 2500, 5000];

export interface ConfiguratorProps {
  catalog: Catalog;
  tables: Record<string, PriceTable>;
  maxUploadMb: number;
  transit: { min: number; max: number };
  whatsappNumber: string;
  initial: Partial<ConfigState> & { artworkStatus?: ArtworkMode; notes?: string };
  initialArtwork?: UploadedArtwork | null;
  editItemId?: string | null;
  initialStep?: StepKey;
}

export function PatchConfigurator({ catalog, tables, maxUploadMb, transit, whatsappNumber, initial, initialArtwork = null, editItemId, initialStep }: ConfiguratorProps) {
  const router = useRouter();
  const toast = useToast();
  const reduce = useReducedMotion();
  const [pending, startTransition] = useTransition();
  const topRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<ConfigState>(() => {
    const base: ConfigState = { patchTypeId: initial.patchTypeId ?? null, widthIn: initial.widthIn ?? 3, heightIn: initial.heightIn ?? 3, quantity: initial.quantity ?? 100, shape: initial.shape ?? null, backingId: initial.backingId ?? null, borderId: initial.borderId ?? null, extraIds: initial.extraIds ?? [] };
    return base.patchTypeId ? reconcile(catalog, base).state : base;
  });
  const [artwork, setArtwork] = useState<UploadedArtwork | null>(initialArtwork);
  const [artworkMode, setArtworkMode] = useState<ArtworkMode>(initial.artworkStatus ?? (initialArtwork ? "UPLOADED" : "UPLOADED"));
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [customSize, setCustomSize] = useState(() => !SIZE_PRESETS.includes(state.widthIn) || state.widthIn !== state.heightIn);
  const [notices, setNotices] = useState<{ field: ConfigField; message: string }[]>([]);
  const [direction, setDirection] = useState(1);

  const pt = getPatchType(catalog, state.patchTypeId);
  const hasBorder = requiresBorder(catalog, pt);
  const steps: StepKey[] = useMemo(() => ["type", "artwork", "size", "quantity", "shape", "backing", ...(hasBorder ? (["border"] as const) : []), ...(pt && allowedExtras(catalog, pt).length ? (["extras"] as const) : []), "review"], [hasBorder, pt, catalog]);
  const [stepKey, setStepKey] = useState<StepKey>(initialStep ?? (initial.patchTypeId ? "artwork" : "type"));
  const stepIndex = Math.max(0, steps.indexOf(stepKey));

  useEffect(() => track("start_configurator", { from_params: !!initial.patchTypeId }), []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Every change goes through the rule engine; incompatible properties are reset with a message. */
  const update = (patch: Partial<ConfigState>) => {
    setState((prev) => {
      const { state: next, resets } = reconcile(catalog, { ...prev, ...patch });
      if (resets.length) {
        setNotices(resets);
        resets.forEach((r) => toast({ tone: "info", title: "Heads up", description: r.message }));
      }
      return next;
    });
  };

  const quote = useMemo(() => quoteConfiguration(catalog, tables, state, { partial: true }), [catalog, tables, state]);
  const fullViolations = useMemo(() => validateConfig(catalog, state), [catalog, state]);
  const delivery = useMemo(
    () => (pt ? estimateDelivery({ productionDays: pt.productionDays, rushProductionDays: pt.rushProductionDays, rush: quote.ok && quote.rush, transitDaysMin: transit.min, transitDaysMax: transit.max }) : null),
    [pt, quote, transit],
  );

  const backing = catalog.backings.find((b) => b.id === state.backingId);
  const border = catalog.borders.find((b) => b.id === state.borderId);
  const extras = catalog.extras.filter((e) => state.extraIds.includes(e.id));

  useEffect(() => {
    if (!pt) return setWhatsAppContext(null);
    setWhatsAppContext({
      type: pt.name, size: `${state.widthIn}" × ${state.heightIn}"`, quantity: state.quantity.toLocaleString("en-US"),
      backing: backing?.name ?? "Not chosen yet", estimate: quote.ok ? `${formatUSD(quote.line.lineSubtotalCents)} (${formatUSD(quote.line.unitPriceCents)}/ea)` : "—",
    });
    return () => setWhatsAppContext(null);
  }, [pt, state, backing, quote]);

  const stepComplete = (k: StepKey): boolean => {
    switch (k) {
      case "type": return !!pt;
      case "artwork": return artworkMode !== "UPLOADED" || !!artwork;
      case "size": return !fullViolations.some((v) => v.field === "size");
      case "quantity": return !fullViolations.some((v) => v.field === "quantity");
      case "shape": return !!state.shape && !fullViolations.some((v) => v.field === "shape");
      case "backing": return !!state.backingId;
      case "border": return !!state.borderId;
      case "extras": return true;
      case "review": return fullViolations.length === 0 && stepComplete("artwork");
    }
  };

  const go = (k: StepKey) => {
    setDirection(steps.indexOf(k) >= stepIndex ? 1 : -1);
    setStepKey(k);
    setNotices([]);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
  };
  const next = () => {
    if (!stepComplete(stepKey)) {
      toast({ tone: "error", title: "One more thing", description: stepHint(stepKey) });
      return;
    }
    if (stepKey === "extras" || (stepKey === steps[steps.length - 2])) track("complete_configurator", { patch_type: pt?.code, quantity: state.quantity });
    const n = steps[stepIndex + 1];
    if (n) go(n);
  };
  const back = () => stepIndex > 0 && go(steps[stepIndex - 1]);

  const stepHint = (k: StepKey) =>
    ({ type: "Choose a patch type to continue.", artwork: "Upload your artwork — or choose design help / send it later.", size: fullViolations.find((v) => v.field === "size")?.message ?? "Choose a size.", quantity: fullViolations.find((v) => v.field === "quantity")?.message ?? "Choose a quantity.", shape: "Choose a shape.", backing: "Choose a backing.", border: "Choose a border.", extras: "", review: fullViolations[0]?.message ?? "Please complete every step." })[k];

  const payload = () => ({
    patchTypeId: state.patchTypeId, widthIn: state.widthIn, heightIn: state.heightIn, quantity: state.quantity, shape: state.shape,
    backingId: state.backingId, borderId: state.borderId, extraIds: state.extraIds,
    artworkStatus: artworkMode === "UPLOADED" && !artwork ? "SEND_LATER" : artworkMode, artworkFileId: artworkMode === "UPLOADED" ? artwork?.id ?? null : null, notes,
  });

  const onAddToCart = () =>
    startTransition(async () => {
      const res = editItemId ? await updateCartItemAction(editItemId, payload()) : await addToCartAction(payload());
      if (!res.ok) {
        toast({ tone: "error", title: "Couldn't add to cart", description: res.error });
        return;
      }
      track("add_to_cart", { patch_type: pt?.code, quantity: state.quantity, value: quote.ok ? quote.line.lineSubtotalCents / 100 : undefined, currency: "USD" });
      toast({ tone: "success", title: editItemId ? "Cart updated" : "Added to cart", description: `${pt?.name} × ${state.quantity.toLocaleString("en-US")}` });
      router.push("/cart");
      router.refresh();
    });

  const onSave = () =>
    startTransition(async () => {
      const res = await saveDesignAction(payload());
      if (!res.ok) {
        if ("needsLogin" in res) {
          toast({ tone: "info", title: "Sign in to save designs", description: "Create a free account — your design will be waiting." });
          router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
          return;
        }
        toast({ tone: "error", title: "Couldn't save", description: res.error });
        return;
      }
      toast({ tone: "success", title: "Design saved", description: "Find it any time under Account → Saved designs." });
    });

  const mockupHref = () => {
    const p = new URLSearchParams();
    if (pt) p.set("type", pt.id);
    p.set("size", `${state.widthIn}x${state.heightIn}`);
    p.set("qty", String(state.quantity));
    if (artwork) p.set("artwork", artwork.id);
    if (notes) p.set("notes", notes.slice(0, 500));
    return `/free-mockup?${p.toString()}`;
  };

  const expertHref = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage({ type: pt?.name, size: `${state.widthIn}" × ${state.heightIn}"`, quantity: String(state.quantity), backing: backing?.name, estimate: quote.ok ? formatUSD(quote.line.lineSubtotalCents) : undefined }))}` : `/support?topic=quote`;

  /* ─────────── Step bodies ─────────── */
  const qtyPrice = (q: number) => {
    if (!pt || q < pt.minQuantity) return null;
    const r = quoteConfiguration(catalog, tables, { ...state, quantity: q }, { partial: true });
    return r.ok ? r.line.unitPriceCents : null;
  };

  const body: Record<StepKey, React.ReactNode> = {
    type: (
      <StepShell title="Choose your patch type" sub="Each style has its own texture, detail level and best use.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Patch type">
          {catalog.patchTypes.map((p) => {
            const selected = p.id === state.patchTypeId;
            const from = Math.min(...tables[p.id].cells.map((c) => c.unitPriceCents));
            return (
              <OptionCard key={p.id} selected={selected} onSelect={() => { update({ patchTypeId: p.id }); track("select_patch_type", { patch_type: p.code }); }} label={p.name}>
                <div className="flex items-center gap-4">
                  <div className="w-16 shrink-0"><PatchArt code={p.code} title="" /></div>
                  <div className="min-w-0">
                    <p className="font-display text-xl font-extrabold uppercase leading-none">{p.shortName}</p>
                    <p className="mt-1 text-sm text-slate">{p.shortDescription}</p>
                    <p className="mt-1 text-xs font-semibold text-patch">From {formatUSD(from)}/ea · min {p.minQuantity}</p>
                  </div>
                </div>
              </OptionCard>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-slate">Not sure? <Link href="/patch-finder" className="font-semibold text-patch hover:underline">Take the 60-second patch finder</Link>.</p>
      </StepShell>
    ),
    artwork: (
      <StepShell title="Add your artwork" sub="Any format, any quality. We'll make it production-ready.">
        <div className="mb-5 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Artwork option">
          {([["UPLOADED", "Upload artwork"], ["NEEDS_DESIGN_HELP", "I need design help"], ["SEND_LATER", "I'll send it later"]] as const).map(([k, l]) => (
            <OptionCard key={k} selected={artworkMode === k} onSelect={() => setArtworkMode(k)} label={l} compact>
              <span className="font-semibold">{l}</span>
            </OptionCard>
          ))}
        </div>
        {artworkMode === "UPLOADED" && <ArtworkUploader value={artwork} onChange={setArtwork} maxMb={maxUploadMb} />}
        {artworkMode === "NEEDS_DESIGN_HELP" && <Callout>Not production-ready? That&apos;s our problem. Describe your idea below — a designer will sketch it into your proof for free.</Callout>}
        {artworkMode === "SEND_LATER" && <Callout>No problem. You can upload artwork after ordering from your order page — nothing is produced until you approve a proof.</Callout>}
        <label htmlFor="cfg-notes" className="mt-6 block text-sm font-semibold">Design notes <span className="font-normal text-slate">(optional)</span></label>
        <Textarea id="cfg-notes" className="mt-1.5" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Thread colors, Pantone references, text that must be legible, placement…" />
      </StepShell>
    ),
    size: (
      <StepShell title="Pick a size" sub={pt ? `${pt.shortName} patches: ${pt.minSizeIn}" to ${pt.maxSizeIn}". Size is quoted as the average of width and height.` : ""}>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Preset sizes">
          {SIZE_PRESETS.filter((s) => !pt || (s >= pt.minSizeIn && s <= pt.maxSizeIn)).map((s) => (
            <Chip key={s} selected={!customSize && state.widthIn === s && state.heightIn === s} onClick={() => { setCustomSize(false); update({ widthIn: s, heightIn: s }); track("select_size", { size: s }); }}>{s}&quot;</Chip>
          ))}
          <Chip selected={customSize} onClick={() => setCustomSize(true)}>Custom</Chip>
        </div>
        {customSize && (
          <div className="mt-5 grid max-w-md grid-cols-2 gap-4">
            <div>
              <label htmlFor="cfg-w" className="text-sm font-semibold">Width (in)</label>
              <Input id="cfg-w" type="number" inputMode="decimal" step="0.25" min="0.5" max="20" value={state.widthIn} onChange={(e) => update({ widthIn: Number(e.target.value) })} className="mt-1.5" />
            </div>
            <div>
              <label htmlFor="cfg-h" className="text-sm font-semibold">Height (in)</label>
              <Input id="cfg-h" type="number" inputMode="decimal" step="0.25" min="0.5" max="20" value={state.heightIn} onChange={(e) => update({ heightIn: Number(e.target.value) })} className="mt-1.5" />
            </div>
            <p className="col-span-2 text-sm text-slate">Quoted size: <strong className="text-navy">{((state.widthIn + state.heightIn) / 2 || 0).toFixed(2)}&quot;</strong> = ({state.widthIn} + {state.heightIn}) ÷ 2</p>
          </div>
        )}
        <FieldError violations={fullViolations} field="size" />
        <SizeVisual widthIn={state.widthIn} heightIn={state.heightIn} shape={state.shape} className="mt-6 max-w-lg rounded-2xl bg-white p-4 ring-1 ring-line" />
      </StepShell>
    ),
    quantity: (
      <StepShell title="How many?" sub="25 or 2,500 — Gorilla doesn't judge. Bigger runs, better per-patch price.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Quantity">
          {QTY_PRESETS.map((q) => {
            const price = qtyPrice(q);
            const disabled = !!pt && q < pt.minQuantity;
            return (
              <button key={q} type="button" role="radio" aria-checked={state.quantity === q} disabled={disabled} onClick={() => { update({ quantity: q }); track("select_quantity", { quantity: q }); }}
                className={cn("flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 px-2 py-2 transition-all disabled:opacity-35", state.quantity === q ? "border-transparent bg-navy text-white shadow-lift" : "border-navy/10 bg-white hover:border-navy/40")}>
                <span className="font-display text-2xl font-extrabold leading-none">{q.toLocaleString("en-US")}</span>
                <span className={cn("mt-1 text-xs tabular-nums", state.quantity === q ? "text-turquoise" : "text-slate")}>{price !== null ? `${formatUSD(price)}/ea` : disabled ? `min ${pt?.minQuantity}` : "—"}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 max-w-xs">
          <label htmlFor="cfg-qty" className="text-sm font-semibold">Custom quantity</label>
          <Input id="cfg-qty" type="number" inputMode="numeric" min={pt?.minQuantity ?? 1} step={1} value={state.quantity} onChange={(e) => update({ quantity: Math.max(1, Math.round(Number(e.target.value) || 0)) })} className="mt-1.5" />
        </div>
        <FieldError violations={fullViolations} field="quantity" />
        {quote.ok && (
          <dl className="mt-6 grid max-w-lg grid-cols-3 gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">
            <div><dt className="text-xs text-slate">Per patch</dt><dd className="font-display text-2xl font-extrabold"><AnimatedPrice cents={quote.line.unitPriceCents} /></dd></div>
            <div><dt className="text-xs text-slate">Subtotal</dt><dd className="font-display text-2xl font-extrabold"><AnimatedPrice cents={quote.line.lineSubtotalCents} /></dd></div>
            <div><dt className="text-xs text-slate">You save</dt><dd className="font-display text-2xl font-extrabold text-success"><AnimatedPrice cents={quote.line.savingsCents} /></dd></div>
          </dl>
        )}
      </StepShell>
    ),
    shape: (
      <StepShell title="Choose a shape" sub="Custom shapes follow your artwork's outline.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Shape">
          {allowedShapes(pt).map((s) => (
            <OptionCard key={s} selected={state.shape === s} onSelect={() => update({ shape: s as Shape })} label={titleShape(s)} compact>
              <span className="flex items-center gap-3"><ShapeIcon shape={s} className="text-patch" /><span className="font-semibold">{titleShape(s)}</span></span>
            </OptionCard>
          ))}
        </div>
      </StepShell>
    ),
    backing: (
      <StepShell title="Choose a backing" sub="How the patch attaches. Only options that work with your patch type are shown.">
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Backing">
          {allowedBackings(catalog, pt).map((b) => (
            <OptionCard key={b.id} selected={state.backingId === b.id} onSelect={() => update({ backingId: b.id })} label={b.name}>
              <div className="flex gap-4">
                {b.imageUrl && <Image src={b.imageUrl} alt="" width={56} height={56} unoptimized className="h-14 w-14 shrink-0" />}
                <div>
                  <p className="font-semibold">{b.name} <span className="ml-1 text-sm font-semibold text-patch">{modLabel(b)}</span></p>
                  <p className="mt-1 text-sm text-slate">{b.description}</p>
                </div>
              </div>
            </OptionCard>
          ))}
        </div>
      </StepShell>
    ),
    border: (
      <StepShell title="Choose a border" sub={state.shape === "CUSTOM" ? "Custom shapes need a heat-cut or laser-cut edge." : "The finish around the edge of your patch."}>
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Border">
          {allowedBorders(catalog, pt, state.shape).map((b) => (
            <OptionCard key={b.id} selected={state.borderId === b.id} onSelect={() => update({ borderId: b.id })} label={b.name}>
              {b.imageUrl && <Image src={b.imageUrl} alt="" width={56} height={56} unoptimized className="mb-3 h-14 w-14" />}
              <p className="font-semibold">{b.name} <span className="ml-1 text-sm text-patch">{modLabel(b)}</span></p>
              <p className="mt-1 text-sm text-slate">{b.description}</p>
            </OptionCard>
          ))}
        </div>
      </StepShell>
    ),
    extras: (
      <StepShell title="Add extras" sub="Optional upgrades. Skip if you're happy as is.">
        <div className="grid gap-3 sm:grid-cols-2">
          {allowedExtras(catalog, pt).map((e) => {
            const on = state.extraIds.includes(e.id);
            return (
              <button key={e.id} type="button" role="switch" aria-checked={on} onClick={() => update({ extraIds: on ? state.extraIds.filter((x) => x !== e.id) : [...state.extraIds, e.id] })}
                className={cn("flex items-start gap-4 rounded-2xl border-2 p-4 text-left transition-all", on ? "border-electric bg-electric/5" : "border-navy/10 bg-white hover:border-navy/30")}>
                <span className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors", on ? "border-transparent bg-signature text-white" : "border-navy/20")}>{on && <Check className="h-4 w-4" />}</span>
                <span>
                  <span className="font-semibold">{e.name} <span className="ml-1 text-sm text-patch">{modLabel(e)}</span></span>
                  <span className="mt-1 block text-sm text-slate">{e.description}{e.isRush && pt ? ` Ships in ~${pt.rushProductionDays} business days instead of ${pt.productionDays}.` : ""}</span>
                </span>
              </button>
            );
          })}
        </div>
      </StepShell>
    ),
    review: (
      <StepShell title="Review your patch" sub="See it before we make it — you'll approve a digital proof before production.">
        <div className="overflow-hidden rounded-[1.5rem] bg-white ring-1 ring-line">
          <ul className="divide-y divide-line">
            {([
              ["type", "Product", pt?.name],
              ["artwork", "Artwork", artworkMode === "UPLOADED" ? artwork?.filename ?? "Not uploaded" : artworkMode === "NEEDS_DESIGN_HELP" ? "Design help requested" : "Sending later"],
              ["size", "Size", `${state.widthIn}" × ${state.heightIn}" (quoted ${((state.widthIn + state.heightIn) / 2).toFixed(2)}")`],
              ["quantity", "Quantity", state.quantity.toLocaleString("en-US")],
              ["shape", "Shape", state.shape ? titleShape(state.shape) : "—"],
              ["backing", "Backing", backing?.name ?? "—"],
              ...(hasBorder ? [["border", "Border", border?.name ?? "—"] as const] : []),
              ...(steps.includes("extras") ? [["extras", "Extras", extras.length ? extras.map((e) => e.name).join(", ") : "None"] as const] : []),
            ] as [StepKey, string, string | undefined][]).map(([k, label, value]) => (
              <li key={k} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <span className="text-sm text-slate">{label}</span>
                <span className="flex items-center gap-3 text-right font-semibold">
                  {value}
                  <button type="button" onClick={() => go(k)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-ice" aria-label={`Edit ${label.toLowerCase()}`}><Pencil className="h-3.5 w-3.5 text-slate" /></button>
                </span>
              </li>
            ))}
          </ul>
          {notes && <p className="border-t border-line px-5 py-3.5 text-sm text-slate"><span className="font-semibold text-navy">Notes:</span> {notes}</p>}
        </div>
        {fullViolations.length > 0 && <div role="alert" className="mt-4 rounded-2xl bg-danger/5 p-4 text-sm text-danger">{fullViolations.map((v) => <p key={v.field + v.message}>{v.message}</p>)}</div>}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button size="lg" onClick={() => router.push(mockupHref())} variant="dark"><Sparkles className="h-5 w-5" aria-hidden /> Get free mockup</Button>
          <Button size="lg" onClick={onAddToCart} disabled={pending || fullViolations.length > 0} arrow><ShoppingBag className="h-5 w-5" aria-hidden /> {editItemId ? "Update cart" : "Add to cart"}</Button>
          <Button size="md" variant="outline" onClick={onSave} disabled={pending || fullViolations.length > 0}><Bookmark className="h-4 w-4" aria-hidden /> Save design</Button>
          <a href={expertHref} target={whatsappNumber ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => whatsappNumber && track("open_whatsapp", { from: "configurator" })} className="inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-navy/15 font-display text-lg font-extrabold uppercase tracking-[0.06em] text-navy hover:border-navy">
            <MessageCircle className="h-4 w-4" aria-hidden /> Talk to a patch expert
          </a>
        </div>
      </StepShell>
    ),
  };

  return (
    <div ref={topRef} className="scroll-mt-24">
      <ConfiguratorProgress steps={steps} current={stepIndex} complete={stepComplete} onJump={(k) => (steps.indexOf(k) <= stepIndex || steps.slice(0, steps.indexOf(k)).every(stepComplete)) && go(k)} />

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
        <div className="min-w-0 pb-36 lg:pb-0">
          <AnimatePresence>
            {notices.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} role="status" className="mb-4 overflow-hidden rounded-2xl border border-gold/30 bg-gold/10 p-4 text-sm text-navy">
                {notices.map((n) => <p key={n.field} className="flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />{n.message}</p>)}
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div key={stepKey} custom={direction} initial={reduce ? false : { opacity: 0, x: direction * 28 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0, x: direction * -28 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
              {body[stepKey]}
            </motion.div>
          </AnimatePresence>
          <div className="mt-8 hidden items-center justify-between lg:flex">
            <Button variant="ghost" onClick={back} disabled={stepIndex === 0}><ArrowLeft className="h-4 w-4" aria-hidden /> Back</Button>
            {stepKey !== "review" && <Button onClick={next} arrow>Continue</Button>}
          </div>
        </div>

        {/* Sticky summary (desktop) */}
        <aside className="hidden lg:block" aria-label="Order summary">
          <div className="sticky top-24">
            <ConfigurationSummary
              ptName={pt?.name} ptCode={pt?.code} state={state} backing={backing?.name} border={border?.name} extras={extras.map((e) => e.name)}
              unitCents={quote.ok ? quote.line.unitPriceCents : null} totalCents={quote.ok ? quote.line.lineSubtotalCents : null} savingsCents={quote.ok ? quote.line.savingsCents : 0}
              error={!quote.ok ? quote.pricingError ?? quote.violations[0]?.message : null} delivery={delivery}
            />
          </div>
        </aside>
      </div>

      {/* Mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 shadow-[0_-12px_30px_-18px_rgb(3_27_61/.4)] backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <button type="button" onClick={back} disabled={stepIndex === 0} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-navy/10 disabled:opacity-30" aria-label="Previous step"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-slate">{pt ? `${pt.shortName} · ${state.widthIn}"×${state.heightIn}" · ${state.quantity.toLocaleString("en-US")} pcs` : "Choose a patch type"}</p>
            <p className="font-display text-2xl font-extrabold leading-none"><AnimatedPrice cents={quote.ok ? quote.line.lineSubtotalCents : null} /> <span className="text-sm font-semibold text-slate">{quote.ok ? `${formatUSD(quote.line.unitPriceCents)}/ea` : ""}</span></p>
          </div>
          {stepKey !== "review" ? (
            <button type="button" onClick={next} className="bg-signature flex h-12 items-center gap-1 rounded-full px-5 font-display text-lg font-extrabold uppercase tracking-wide text-white">Next <ArrowRight className="h-4 w-4" aria-hidden /></button>
          ) : (
            <button type="button" onClick={onAddToCart} disabled={pending || fullViolations.length > 0} className="bg-signature flex h-12 items-center gap-1 rounded-full px-5 font-display text-lg font-extrabold uppercase tracking-wide text-white disabled:opacity-50">Add <ShoppingBag className="h-4 w-4" aria-hidden /></button>
          )}
        </div>
      </div>
    </div>
  );
}

function modLabel(m: { modifierType: string; modifierValue: number }) {
  if (!m.modifierValue) return "Included";
  if (m.modifierType === "PERCENT") return `+${m.modifierValue / 100}%`;
  if (m.modifierType === "FIXED") return `+${formatUSD(m.modifierValue)}`;
  return `+${formatUSD(m.modifierValue)}/ea`;
}

function StepShell({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby="step-title">
      <h2 id="step-title" className="display text-[clamp(2.2rem,5vw,3.6rem)]">{title}</h2>
      {sub && <p className="mt-2 max-w-2xl text-slate">{sub}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function OptionCard({ selected, onSelect, label, children, compact }: { selected: boolean; onSelect: () => void; label: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <motion.button type="button" role="radio" aria-checked={selected} aria-label={label} onClick={onSelect} whileTap={{ scale: 0.98 }}
      className={cn("relative w-full rounded-2xl border-2 text-left transition-[border-color,background-color,box-shadow] duration-200", compact ? "p-4" : "p-4 sm:p-5", selected ? "border-electric bg-white shadow-[0_0_0_4px_rgb(0_141_229/.12)]" : "border-navy/10 bg-white hover:border-navy/30")}>
      {children}
      <AnimatePresence>
        {selected && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 22 }} className="bg-signature absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full text-white ring-4 ring-offwhite">
            <Check className="h-4 w-4" aria-hidden />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onClick} className={cn("h-12 min-w-16 rounded-full border-2 px-4 font-display text-xl font-extrabold transition-all", selected ? "border-transparent bg-signature text-white shadow-glow" : "border-navy/10 bg-white hover:border-navy/40")}>
      {children}
    </button>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-navy p-5 text-white/85"><Sparkles className="mb-2 h-5 w-5 text-turquoise" aria-hidden />{children}</div>;
}

function FieldError({ violations, field }: { violations: { field: string; message: string }[]; field: string }) {
  const v = violations.find((x) => x.field === field);
  return v ? <p role="alert" className="mt-3 text-sm font-medium text-danger">{v.message}</p> : null;
}

function ConfiguratorProgress({ steps, current, complete, onJump }: { steps: StepKey[]; current: number; complete: (k: StepKey) => boolean; onJump: (k: StepKey) => void }) {
  return (
    <nav aria-label="Configurator progress">
      <div className="flex items-center justify-between lg:hidden">
        <p className="eyebrow text-slate">Step {current + 1} / {steps.length}</p>
        <p className="font-display text-lg font-extrabold uppercase">{STEP_LABEL[steps[current]]}</p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy/10 lg:hidden">
        <motion.div className="bg-signature h-full" animate={{ width: `${((current + 1) / steps.length) * 100}%` }} />
      </div>
      <ol className="hidden gap-1 lg:flex">
        {steps.map((s, i) => {
          const done = i < current && complete(s);
          return (
            <li key={s} className="flex-1">
              <button type="button" onClick={() => onJump(s)} aria-current={i === current ? "step" : undefined} className="group w-full text-left">
                <span className={cn("block h-1.5 rounded-full transition-colors duration-500", i <= current ? "bg-signature" : "bg-navy/10")} />
                <span className={cn("mt-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider", i === current ? "text-navy" : "text-slate group-hover:text-navy")}>
                  {done ? <Check className="h-3.5 w-3.5 text-success" aria-hidden /> : <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>}
                  {STEP_LABEL[s]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ConfigurationSummary(props: {
  ptName?: string; ptCode?: string; state: ConfigState; backing?: string; border?: string; extras: string[];
  unitCents: number | null; totalCents: number | null; savingsCents: number; error?: string | null; delivery: ReturnType<typeof estimateDelivery> | null;
}) {
  const { state } = props;
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] bg-midnight p-6 text-white shadow-[0_30px_60px_-30px_rgb(2_11_29/.8)]">
      <div className="grid-texture-dark absolute inset-0 opacity-50" aria-hidden />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-white/50">Your patch</p>
            <p className="display mt-1 text-3xl">{props.ptName ?? "Make it yours."}</p>
          </div>
          <motion.div key={props.ptCode} initial={{ rotate: -20, scale: 0.6 }} animate={{ rotate: -6, scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }} className="w-20 shrink-0">
            <PatchArt code={props.ptCode ?? "EMBROIDERED"} title="" />
          </motion.div>
        </div>
        <dl className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
          {[
            ["Size", `${state.widthIn}" × ${state.heightIn}"`],
            ["Quantity", state.quantity.toLocaleString("en-US")],
            ["Shape", state.shape ? titleShape(state.shape) : "—"],
            ["Backing", props.backing ?? "—"],
            ...(props.border ? [["Border", props.border]] : []),
            ...(props.extras.length ? [["Extras", props.extras.join(", ")]] : []),
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4"><dt className="text-white/55">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
          ))}
        </dl>
        <div className="mt-5 border-t border-white/10 pt-5">
          {props.error ? <p role="alert" className="text-sm text-gold-hi">{props.error}</p> : null}
          <p className="text-sm text-white/60">Estimated total</p>
          <AnimatedPrice cents={props.totalCents} className="display text-6xl" />
          <p className="mt-1 text-sm text-white/70"><AnimatedPrice cents={props.unitCents} /> per patch</p>
          {props.savingsCents > 0 && <p className="mt-1 text-sm font-semibold text-turquoise">Saving {formatUSD(props.savingsCents)} with volume pricing</p>}
          {props.delivery && (
            <p className="mt-4 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/80">
              Est. delivery <strong className="text-white">{formatDate(props.delivery.earliest, { month: "short", day: "numeric" })} – {formatDate(props.delivery.latest, { month: "short", day: "numeric" })}</strong>
              <span className="block text-xs text-white/50">If you approve your proof within a day. Shipping &amp; tax calculated at checkout.</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
