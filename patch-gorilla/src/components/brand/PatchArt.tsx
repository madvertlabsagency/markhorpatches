/**
 * Designed SVG placeholders for each patch type — lightweight, on-brand and crisp at any size.
 * Replace with real product photography by setting PatchType.imageUrl in /admin/products.
 */
import { cn } from "@/lib/utils";

type Code = "EMBROIDERED" | "WOVEN" | "PVC" | "CHENILLE" | "LEATHER" | "PRINTED" | "PUFF_3D" | string;

export function PatchArt({ code, className, title }: { code: Code; className?: string; title?: string }) {
  const id = `pa-${code}`;
  const label = title ?? `${code.toLowerCase().replace("_", " ")} patch illustration`;
  return (
    <svg viewBox="0 0 240 240" className={cn("h-auto w-full drop-shadow-[0_18px_24px_rgb(2_11_29/.35)]", className)} role="img" aria-label={label}>
      <defs>
        <linearGradient id={`${id}-sig`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0A2A6B" />
          <stop offset=".52" stopColor="#0A6CF2" />
          <stop offset="1" stopColor="#0AD2F7" />
        </linearGradient>
        <pattern id={`${id}-satin`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
          <rect width="5" height="5" fill="none" />
          <line x1="0" y1="0" x2="0" y2="5" stroke="#fff" strokeOpacity=".16" strokeWidth="1.6" />
        </pattern>
        <pattern id={`${id}-weave`} width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="none" />
          <path d="M0 1.5h3M1.5 0v3" stroke="#000" strokeOpacity=".12" strokeWidth=".6" />
        </pattern>
        <filter id={`${id}-fuzz`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="5" />
        </filter>
        <filter id={`${id}-bevel`}>
          <feDropShadow dx="0" dy="3" stdDeviation="1.6" floodColor="#050B18" floodOpacity=".55" />
        </filter>
        <radialGradient id={`${id}-gloss`} cx=".35" cy=".25" r=".8">
          <stop offset="0" stopColor="#fff" stopOpacity=".35" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-leather`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a8693c" />
          <stop offset="1" stopColor="#6e3d1d" />
        </linearGradient>
        <linearGradient id={`${id}-sunset`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0AD2F7" />
          <stop offset=".45" stopColor="#0A74F5" />
          <stop offset=".75" stopColor="#ffb34d" />
          <stop offset="1" stopColor="#ff6b4a" />
        </linearGradient>
      </defs>
      {renderArt(code, id)}
    </svg>
  );
}

function renderArt(code: Code, id: string) {
  switch (code) {
    case "WOVEN":
      return (
        <g>
          <rect x="18" y="58" width="204" height="124" rx="14" fill="#F3F1EA" />
          <rect x="18" y="58" width="204" height="124" rx="14" fill={`url(#${id}-weave)`} />
          <rect x="26" y="66" width="188" height="108" rx="9" fill="none" stroke="#081A36" strokeWidth="2" strokeDasharray="4 3" />
          <path d="M70 140 L100 92 L118 118 L132 100 L170 140 Z" fill="#081A36" />
          <path d="M100 92 L108 104 L96 108 Z M132 100 L138 109 L128 112 Z" fill="#fff" />
          <rect x="62" y="146" width="116" height="4" rx="2" fill="#0A4AD6" />
          <text x="120" y="88" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="13" letterSpacing="3" fill="#081A36">EST. 2026</text>
          <text x="120" y="166" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize="10" letterSpacing="4" fill="#536276">FINE DETAIL CO.</text>
        </g>
      );
    case "PVC":
      return (
        <g>
          <path d="M120 22 L200 50 L194 140 C188 180 152 206 120 218 C88 206 52 180 46 140 L40 50 Z" fill="#0B2347" />
          <path d="M120 34 L188 58 L183 138 C178 172 148 194 120 205 C92 194 62 172 57 138 L52 58 Z" fill="#0A1830" filter={`url(#${id}-bevel)`} />
          <path d="M132 58 L92 132 L118 132 L104 184 L152 102 L126 102 L142 58 Z" fill="#0AD2F7" filter={`url(#${id}-bevel)`} />
          <path d="M132 58 L92 132 L118 132 L104 184 L152 102 L126 102 L142 58 Z" fill={`url(#${id}-sig)`} opacity=".55" />
          <path d="M120 22 L200 50 L194 140 C188 180 152 206 120 218 C88 206 52 180 46 140 L40 50 Z" fill={`url(#${id}-gloss)`} />
        </g>
      );
    case "CHENILLE":
      return (
        <g>
          <circle cx="120" cy="120" r="98" fill="#F3F1EA" />
          <circle cx="120" cy="120" r="88" fill="#0A4AD6" />
          <circle cx="120" cy="120" r="98" fill="none" stroke="#081A36" strokeWidth="3" strokeDasharray="2 4" />
          <g filter={`url(#${id}-fuzz)`}>
            <text x="120" y="160" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900" fontSize="128" fill="#F3F1EA">M</text>
          </g>
          <text x="120" y="160" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900" fontSize="128" fill="none" stroke="#0AD2F7" strokeWidth="3" strokeDasharray="3 3" opacity=".9">M</text>
        </g>
      );
    case "LEATHER":
      return (
        <g>
          <rect x="22" y="62" width="196" height="116" rx="26" fill={`url(#${id}-leather)`} />
          <rect x="22" y="62" width="196" height="116" rx="26" fill={`url(#${id}-gloss)`} opacity=".5" />
          <rect x="32" y="72" width="176" height="96" rx="18" fill="none" stroke="#f1d9b5" strokeOpacity=".6" strokeWidth="1.6" strokeDasharray="5 4" />
          <g opacity=".85">
            <path d="M62 150 L104 92 L120 112 L136 96 L178 150 Z" fill="#4a2410" />
            <path d="M104 92 L112 104 L100 108 Z M136 96 L142 104 L131 106 Z" fill="#7a4521" />
            <path d="M62 150 H178" stroke="#e7bf91" strokeOpacity=".35" strokeWidth="1" />
            <text x="120" y="88" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="11" letterSpacing="4" fill="#4a2410">EST. 2026</text>
          </g>
        </g>
      );
    case "PRINTED":
      return (
        <g>
          <circle cx="120" cy="120" r="100" fill="#081A36" />
          <circle cx="120" cy="120" r="88" fill={`url(#${id}-sunset)`} />
          <circle cx="120" cy="138" r="26" fill="#ffd45a" opacity=".95" />
          <path d="M32 160 C 70 134, 96 170, 128 150 C 160 130, 182 158, 208 146 L 208 200 L 32 200 Z" fill="#0A1830" />
          <path d="M32 176 C 70 156, 110 186, 150 168 C 176 156, 196 170, 208 166 L 208 200 L 32 200 Z" fill="#081A36" />
          <circle cx="120" cy="120" r="94" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2" strokeDasharray="3 4" />
        </g>
      );
    case "PUFF_3D":
      return (
        <g>
          <rect x="20" y="64" width="200" height="112" rx="20" fill="#0A1830" />
          <rect x="20" y="64" width="200" height="112" rx="20" fill={`url(#${id}-satin)`} />
          <rect x="28" y="72" width="184" height="96" rx="14" fill="none" stroke="#0AD2F7" strokeWidth="2" strokeDasharray="4 3" opacity=".7" />
          <text x="122" y="146" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900" fontSize="64" fill="#02060f">BOLD</text>
          <text x="120" y="142" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900" fontSize="64" fill={`url(#${id}-sig)`}>BOLD</text>
          <text x="120" y="142" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900" fontSize="64" fill={`url(#${id}-satin)`}>BOLD</text>
        </g>
      );
    case "EMBROIDERED":
    default:
      return (
        <g>
          <circle cx="120" cy="120" r="104" fill="#081A36" />
          <circle cx="120" cy="120" r="104" fill="none" stroke="#0AD2F7" strokeWidth="11" strokeDasharray="2.2 1.6" />
          <circle cx="120" cy="120" r="90" fill="#0A1830" />
          <circle cx="120" cy="120" r="90" fill={`url(#${id}-satin)`} />
          <path d="M44 162 L92 88 L114 120 L134 96 L196 162 Z" fill={`url(#${id}-sig)`} />
          <path d="M44 162 L92 88 L114 120 L134 96 L196 162 Z" fill={`url(#${id}-satin)`} />
          <path d="M92 88 L102 104 L84 108 Z M134 96 L143 108 L126 110 Z" fill="#fff" />
          <circle cx="160" cy="70" r="12" fill="#ffd45a" />
          <circle cx="160" cy="70" r="12" fill={`url(#${id}-satin)`} />
          <path d="M66 176 H174" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 7" />
        </g>
      );
  }
}
