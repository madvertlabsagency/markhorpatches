"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

const SIZES = [2, 2.5, 3, 3.5, 4, 5];
const USES: Record<number, string> = { 2: "Hat sides, sleeves, small chest logos", 2.5: "Hat fronts, left chest", 3: "The all-rounder — chest, bags, caps", 3.5: "Chest, backpacks, jackets", 4: "Jacket fronts, bags, statement chest", 5: "Bold fronts, totes, jacket backs (small)" };

export function SizeCompare() {
  const [selected, setSelected] = useState<number[]>([2, 3, 4]);
  const toggle = (s: number) => setSelected((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s].sort((a, b) => a - b)));
  const px = 56; // px per inch on screen (approximate)
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Sizes to compare">
        {SIZES.map((s) => (
          <button key={s} type="button" aria-pressed={selected.includes(s)} onClick={() => toggle(s)} className={cn("h-12 min-w-16 rounded-full border-2 px-4 font-display text-xl font-extrabold", selected.includes(s) ? "border-transparent bg-signature text-white" : "border-navy/10 bg-white")}>{s}&quot;</button>
        ))}
      </div>
      <div className="mt-8 overflow-x-auto rounded-[1.5rem] bg-white p-6 ring-1 ring-line">
        <div className="flex min-w-max items-end gap-8">
          {selected.map((s) => (
            <figure key={s} className="flex flex-col items-center">
              <div className="grid place-items-center rounded-full bg-navy text-white ring-[6px] ring-inset ring-turquoise/60" style={{ width: s * px, height: s * px }}>
                <span className="font-display text-2xl font-extrabold">{s}&quot;</span>
              </div>
              <figcaption className="mt-3 max-w-[12rem] text-center text-xs text-slate">{USES[s]}</figcaption>
            </figure>
          ))}
          <figure className="flex flex-col items-center">
            <div className="grid place-items-center rounded-lg border-2 border-dashed border-slate/50 bg-ice text-xs text-slate" style={{ width: 3.37 * px, height: 2.125 * px }}>Credit card</div>
            <figcaption className="mt-3 text-xs text-slate">3.37&quot; × 2.13&quot; for reference</figcaption>
          </figure>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate"><strong>Note:</strong> screens scale differently, so these sizes aren&apos;t physically exact. Hold a credit card up to the reference above to calibrate, or measure with a ruler.</p>
    </div>
  );
}
