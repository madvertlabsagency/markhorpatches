"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import * as D from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { cn, titleCase } from "@/lib/utils";

export interface GalleryCardData {
  id: string;
  title: string;
  imageUrl: string;
  alt: string;
  width: number;
  height: number;
  patchType: string | null;
  patchTypeCode: string | null;
  industry: string | null;
  shape: string | null;
  sizeLabel: string | null;
  backingLabel: string | null;
  isPlaceholder: boolean;
}

export function GalleryGrid({ items, dark, showSearch, filters = ["patchType"] }: { items: GalleryCardData[]; dark?: boolean; showSearch?: boolean; filters?: ("patchType" | "industry" | "shape")[] }) {
  const [type, setType] = useState("All");
  const [industry, setIndustry] = useState("All");
  const [shape, setShape] = useState("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  const opts = (key: "patchType" | "industry" | "shape") => ["All", ...Array.from(new Set(items.map((i) => i[key]).filter(Boolean) as string[]))];
  const shown = useMemo(
    () =>
      items.filter(
        (i) =>
          (type === "All" || i.patchType === type) &&
          (industry === "All" || i.industry === industry) &&
          (shape === "All" || i.shape === shape) &&
          (!q || `${i.title} ${i.patchType} ${i.industry}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [items, type, industry, shape, q],
  );

  const chip = (value: string, current: string, set: (v: string) => void, label?: string) => (
    <button
      key={value}
      type="button"
      onClick={() => set(value)}
      aria-pressed={current === value}
      className={cn(
        "h-10 rounded-full px-4 text-sm font-semibold transition-all",
        current === value ? "bg-signature text-white" : dark ? "bg-white/5 text-white/80 ring-1 ring-white/10 hover:bg-white/10" : "bg-white text-navy ring-1 ring-navy/10 hover:ring-navy/30",
      )}
    >
      {label ?? value}
    </button>
  );

  const current = open !== null ? shown[open] : null;

  return (
    <div>
      <div className="mb-8 space-y-3">
        {showSearch && (
          <label className="relative block max-w-md">
            <span className="sr-only">Search gallery</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the gallery" className="h-12 w-full rounded-full border border-line bg-white pl-11 pr-4 text-navy focus:border-electric focus:outline-none" />
          </label>
        )}
        {filters.includes("patchType") && <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filter by patch type">{opts("patchType").map((o) => chip(o, type, setType))}</div>}
        {filters.includes("industry") && <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filter by industry">{opts("industry").map((o) => chip(o, industry, setIndustry, o === "All" ? "All industries" : titleCase(o)))}</div>}
        {filters.includes("shape") && <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filter by shape">{opts("shape").map((o) => chip(o, shape, setShape, o === "All" ? "All shapes" : titleCase(o)))}</div>}
      </div>

      {shown.length === 0 ? (
        <p className={cn("rounded-3xl p-10 text-center", dark ? "bg-white/5 text-white/70" : "bg-white text-slate")}>Nothing here yet — try another filter.</p>
      ) : (
        <motion.ul layout className="columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4">
          <AnimatePresence>
            {shown.map((it, idx) => (
              <motion.li layout key={it.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="mb-3 break-inside-avoid sm:mb-4">
                <button onClick={() => setOpen(idx)} className="group relative block w-full overflow-hidden rounded-2xl bg-deep text-left">
                  <Image src={it.imageUrl} alt={it.alt} width={it.width} height={it.height} sizes="(min-width:1024px) 25vw, 50vw" className="h-auto w-full transition-transform duration-700 group-hover:scale-105" />
                  {it.isPlaceholder && <span className="absolute left-2 top-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy">Sample — replace</span>}
                  <span className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-midnight/95 via-midnight/60 to-transparent p-3 pt-10 text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                    <span className="block font-display text-lg font-extrabold uppercase leading-none">{it.patchType ?? "Custom"}</span>
                    <span className="mt-1 block text-xs text-white/75">{[it.sizeLabel, it.backingLabel].filter(Boolean).join(" · ")}</span>
                  </span>
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      <D.Root open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-[60] bg-midnight/90 backdrop-blur data-[state=open]:animate-[fade-in_.2s_ease]" />
          <D.Content
            className="fixed inset-0 z-[61] flex flex-col items-center justify-center p-4 text-white focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") setOpen((o) => (o === null ? o : (o + 1) % shown.length));
              if (e.key === "ArrowLeft") setOpen((o) => (o === null ? o : (o - 1 + shown.length) % shown.length));
            }}
          >
            {current && (
              <>
                <D.Title className="sr-only">{current.title}</D.Title>
                <D.Description className="sr-only">{current.alt}</D.Description>
                <div className="relative max-h-[72vh] w-full max-w-3xl">
                  <Image src={current.imageUrl} alt={current.alt} width={current.width} height={current.height} className="mx-auto h-auto max-h-[72vh] w-auto rounded-2xl object-contain" sizes="90vw" />
                </div>
                <div className="mt-5 text-center">
                  <p className="display text-3xl">{current.patchType ?? "Custom patch"}</p>
                  <p className="mt-1 text-white/70">{[current.sizeLabel, current.shape && titleCase(current.shape), current.backingLabel].filter(Boolean).join(" · ")}</p>
                  {current.isPlaceholder && <p className="mt-2 text-xs text-gold-hi">Placeholder image — replace with real customer work before launch.</p>}
                </div>
                <button onClick={() => setOpen((o) => (o! - 1 + shown.length) % shown.length)} className="absolute left-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Previous">
                  <ChevronLeft />
                </button>
                <button onClick={() => setOpen((o) => (o! + 1) % shown.length)} className="absolute right-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Next">
                  <ChevronRight />
                </button>
                <D.Close className="absolute right-4 top-4 grid h-12 w-12 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close">
                  <X />
                </D.Close>
              </>
            )}
          </D.Content>
        </D.Portal>
      </D.Root>
    </div>
  );
}
