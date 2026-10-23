import type { Metadata, Viewport } from "next";
import { inter, poppins } from "./fonts";
import { siteUrl } from "@/lib/env";
import { Analytics } from "@/components/layout/Analytics";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl("/")),
  title: { default: "PatchMatch AI — Custom Patch Quotes From Verified Manufacturers", template: "%s · PatchMatch AI" },
  description: "Upload your artwork, share your requirements, and connect with qualified custom patch manufacturers. Free for buyers.",
  applicationName: "PatchMatch AI",
  icons: { apple: [{ url: "/brand/apple-touch-icon.png" }] },
  formatDetection: { telephone: false },
  openGraph: { type: "website", siteName: "PatchMatch AI" },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#07152A" }, { color: "#0B1F3B" }],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US" className={`${poppins.variable} ${inter.variable}`}>
      <body>
        <a href="#main" className="sr-only z-[100] rounded-lg bg-navy px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
          Skip to content
        </a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
