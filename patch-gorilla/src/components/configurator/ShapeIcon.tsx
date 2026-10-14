import type { Shape } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const PATHS: Record<Shape, React.ReactNode> = {
  CIRCLE: <circle cx="24" cy="24" r="18" />,
  SQUARE: <rect x="7" y="7" width="34" height="34" rx="5" />,
  RECTANGLE: <rect x="4" y="12" width="40" height="24" rx="5" />,
  SHIELD: <path d="M24 5 L40 11 L38 28 C36 36 30 41 24 43 C18 41 12 36 10 28 L8 11 Z" />,
  OVAL: <ellipse cx="24" cy="24" rx="20" ry="13" />,
  CUSTOM: <path d="M24 4l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" />,
};

export function ShapeIcon({ shape, className }: { shape: Shape; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("h-10 w-10", className)} aria-hidden fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
      {PATHS[shape]}
    </svg>
  );
}

/** Proportional size preview next to a credit card (3.37" × 2.13") for scale. */
export function SizeVisual({ widthIn, heightIn, shape = "RECTANGLE", className }: { widthIn: number; heightIn: number; shape?: Shape | null; className?: string }) {
  const scale = 26; // px per inch in the SVG viewBox
  const card = { w: 3.37 * scale, h: 2.125 * scale };
  const w = Math.max(0.5, Math.min(widthIn || 0, 12)) * scale;
  const h = Math.max(0.5, Math.min(heightIn || 0, 12)) * scale;
  const vbW = card.w + w + 60;
  const vbH = Math.max(card.h, h) + 50;
  const py = vbH - 30 - h;
  const s = shape ?? "RECTANGLE";
  return (
    <figure className={className}>
      <svg viewBox={`0 0 ${vbW} ${vbH}`} className="h-auto w-full" role="img" aria-label={`A ${widthIn}" by ${heightIn}" patch next to a credit card for scale`}>
        <rect x="10" y={vbH - 30 - card.h} width={card.w} height={card.h} rx="8" fill="#EEF4F7" stroke="#536276" strokeDasharray="4 3" />
        <text x={10 + card.w / 2} y={vbH - 30 - card.h / 2 + 4} textAnchor="middle" fontSize="11" fill="#536276">Credit card</text>
        <g transform={`translate(${card.w + 40}, ${py})`}>
          {s === "CIRCLE" || s === "OVAL" ? (
            <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="#081A36" stroke="#0AD2F7" strokeWidth="3" strokeDasharray="2 2" />
          ) : s === "SHIELD" ? (
            <path d={`M${w / 2} 0 L${w} ${h * 0.14} L${w * 0.95} ${h * 0.6} C${w * 0.9} ${h * 0.82} ${w * 0.7} ${h * 0.95} ${w / 2} ${h} C${w * 0.3} ${h * 0.95} ${w * 0.1} ${h * 0.82} ${w * 0.05} ${h * 0.6} L0 ${h * 0.14} Z`} fill="#081A36" stroke="#0AD2F7" strokeWidth="3" strokeDasharray="2 2" />
          ) : (
            <rect width={w} height={h} rx={Math.min(w, h) * 0.12} fill="#081A36" stroke="#0AD2F7" strokeWidth="3" strokeDasharray="2 2" />
          )}
          <text x={w / 2} y={h + 18} textAnchor="middle" fontSize="12" fontWeight="700" fill="#081A36">{widthIn}&quot; × {heightIn}&quot;</text>
        </g>
      </svg>
      <figcaption className="mt-2 text-xs text-slate">Shown to scale against a credit card. Screens vary, so on-screen sizes aren&apos;t physically exact — use a ruler for a precise check.</figcaption>
    </figure>
  );
}
