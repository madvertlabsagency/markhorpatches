import localFont from "next/font/local";

export const barlow = localFont({
  variable: "--font-barlow",
  display: "swap",
  src: [
    { path: "./fonts/barlow-condensed-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/barlow-condensed-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/barlow-condensed-latin-800-normal.woff2", weight: "800", style: "normal" },
    { path: "./fonts/barlow-condensed-latin-800-italic.woff2", weight: "800", style: "italic" },
    { path: "./fonts/barlow-condensed-latin-900-normal.woff2", weight: "900", style: "normal" },
  ],
  fallback: ["Arial Narrow", "sans-serif"],
});

export const inter = localFont({
  variable: "--font-inter",
  display: "swap",
  src: [{ path: "./fonts/inter-latin-wght-normal.woff2", weight: "100 900", style: "normal" }],
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const marker = localFont({
  variable: "--font-marker",
  display: "swap",
  preload: false,
  src: [{ path: "./fonts/permanent-marker-latin-400-normal.woff2", weight: "400", style: "normal" }],
  fallback: ["cursive"],
});
