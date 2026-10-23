import localFont from "next/font/local";

export const spaceGrotesk = localFont({
  variable: "--font-space-grotesk",
  display: "swap",
  src: [{ path: "./fonts/space-grotesk-latin-wght-normal.woff2", weight: "300 700", style: "normal" }],
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const inter = localFont({
  variable: "--font-inter",
  display: "swap",
  src: [{ path: "./fonts/inter-latin-wght-normal.woff2", weight: "100 900", style: "normal" }],
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});
