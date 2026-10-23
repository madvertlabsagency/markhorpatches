import localFont from "next/font/local";

/** Brand headings: Poppins SemiBold/Bold/ExtraBold. */
export const poppins = localFont({
  variable: "--font-poppins",
  display: "swap",
  src: [
    { path: "./fonts/poppins-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/poppins-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/poppins-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const inter = localFont({
  variable: "--font-inter",
  display: "swap",
  src: [{ path: "./fonts/inter-latin-wght-normal.woff2", weight: "100 900", style: "normal" }],
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});
