import { useId } from "react";
import type { PatchTypeCode } from "@/lib/catalog";
import { PATCH_TYPES } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/**
 * Generated vector illustration of each patch construction (no stock photography, no
 * fabricated product shots). Each texture hints at the real process: satin stitches,
 * moulded PVC layers, terry loops, fine weave, dye gradients, debossed grain, halftone print.
 */
export function PatchArt({ type, className, shape = "shield", label }: { type: PatchTypeCode; className?: string; shape?: "shield" | "circle" | "rounded"; label?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const info = PATCH_TYPES.find((p) => p.code === type);
  const art = info?.art ?? { base: "#121C2E", accent: "#00E5FF", edge: "#00B4FF", texture: "stitch" as const };
  const id = (s: string) => `${s}${uid}`;
  const path =
    shape === "circle"
      ? "M100 8a92 92 0 1 1 0 184a92 92 0 1 1 0-184z"
      : shape === "rounded"
        ? "M38 12h124a26 26 0 0 1 26 26v124a26 26 0 0 1-26 26H38a26 26 0 0 1-26-26V38a26 26 0 0 1 26-26z"
        : "M100 8 L182 36 V98 C182 146 146 178 100 194 C54 178 18 146 18 98 V36 Z";
  const inner =
    shape === "circle"
      ? "M100 22a78 78 0 1 1 0 156a78 78 0 1 1 0-156z"
      : shape === "rounded"
        ? "M42 25h116a17 17 0 0 1 17 17v116a17 17 0 0 1-17 17H42a17 17 0 0 1-17-17V42a17 17 0 0 1 17-17z"
        : "M100 22 L168 45 V98 C168 137 139 163 100 178 C61 163 32 137 32 98 V45 Z";

  return (
    <svg viewBox="0 0 200 200" className={cn("h-auto w-full drop-shadow-[0_18px_30px_rgba(10,15,28,0.28)]", className)} role="img" aria-label={label ?? `${info?.name ?? "Custom patch"} illustration`}>
      <defs>
        <clipPath id={id("clip")}>
          <path d={path} />
        </clipPath>
        <linearGradient id={id("dye")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00E5FF" />
          <stop offset="0.5" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
        <radialGradient id={id("shine")} cx="0.3" cy="0.2" r="0.9">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <pattern id={id("stitch")} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="6" height="6" fill={art.base} />
          <rect width="3" height="6" fill="#fff" opacity="0.06" />
        </pattern>
        <pattern id={id("weave")} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill={art.base} />
          <rect width="2" height="2" fill="#fff" opacity="0.07" />
          <rect x="2" y="2" width="2" height="2" fill="#fff" opacity="0.07" />
        </pattern>
        <pattern id={id("terry")} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill={art.base} />
          <circle cx="4" cy="4" r="2.6" fill="none" stroke="#fff" strokeOpacity="0.16" strokeWidth="1.2" />
        </pattern>
        <pattern id={id("grain")} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill={art.base} />
          <path d="M0 3h10M0 7.5h10" stroke="#000" strokeOpacity="0.08" strokeWidth="0.8" />
          <circle cx="2" cy="5" r="0.7" fill="#000" opacity="0.12" />
          <circle cx="7" cy="1.5" r="0.6" fill="#fff" opacity="0.12" />
        </pattern>
        <pattern id={id("print")} width="7" height="7" patternUnits="userSpaceOnUse">
          <rect width="7" height="7" fill={art.base} />
          <circle cx="3.5" cy="3.5" r="1.3" fill="#fff" opacity="0.12" />
        </pattern>
      </defs>

      {/* Base */}
      <path d={path} fill={art.edge} />
      <g clipPath={`url(#${id("clip")})`}>
        <path
          d={inner}
          fill={
            art.texture === "dye"
              ? `url(#${id("dye")})`
              : art.texture === "weave"
                ? `url(#${id("weave")})`
                : art.texture === "terry"
                  ? `url(#${id("terry")})`
                  : art.texture === "grain"
                    ? `url(#${id("grain")})`
                    : art.texture === "print"
                      ? `url(#${id("print")})`
                      : art.texture === "rubber"
                        ? art.base
                        : `url(#${id("stitch")})`
          }
        />
        {/* Motif: abstract mountain + star mark, rendered per technique */}
        {art.texture === "rubber" ? (
          <g>
            <path d="M52 140 L88 84 L106 110 L120 92 L150 140 Z" fill={art.accent} />
            <path d="M52 140 L88 84 L106 110 L120 92 L150 140 Z" fill="none" stroke="#0A0F1C" strokeWidth="4" strokeLinejoin="round" />
            <circle cx="132" cy="66" r="10" fill="#F7F9FC" stroke="#0A0F1C" strokeWidth="4" />
            <path d="M58 150 h86" stroke="#0A0F1C" strokeWidth="6" strokeLinecap="round" />
          </g>
        ) : art.texture === "grain" ? (
          <g opacity="0.55">
            <path d="M52 140 L88 84 L106 110 L120 92 L150 140 Z" fill="none" stroke="#3B2410" strokeWidth="5" strokeLinejoin="round" />
            <circle cx="132" cy="66" r="9" fill="none" stroke="#3B2410" strokeWidth="4" />
          </g>
        ) : art.texture === "terry" ? (
          <g>
            <text x="100" y="140" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="92" fill={art.accent} stroke="#0A0F1C" strokeWidth="5" paintOrder="stroke">
              P
            </text>
          </g>
        ) : (
          <g>
            <path d="M52 140 L88 84 L106 110 L120 92 L150 140 Z" fill={art.accent} opacity={art.texture === "dye" ? 0.9 : 1} />
            <path d="M72 112 L88 84 L98 98" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
            <circle cx="132" cy="66" r="9" fill="#F7F9FC" />
          </g>
        )}
        <path d={path} fill={`url(#${id("shine")})`} />
      </g>
      {/* Border construction */}
      {art.texture === "rubber" ? (
        <path d={path} fill="none" stroke="#0A0F1C" strokeWidth="5" />
      ) : art.texture === "grain" ? (
        <path d={inner} fill="none" stroke="#3B2410" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="1 6" strokeLinecap="round" />
      ) : (
        <>
          <path d={path} fill="none" stroke={art.edge} strokeWidth="14" />
          <path d={path} fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="12" strokeDasharray="1.2 2.2" />
          <path d={inner} fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.6" strokeDasharray="5 4" />
        </>
      )}
    </svg>
  );
}
