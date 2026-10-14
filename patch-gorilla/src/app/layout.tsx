import type { Metadata, Viewport } from "next";
import { barlow, inter, marker } from "./fonts";
import { siteUrl } from "@/lib/env";
import { DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl("/")),
  title: { default: `${SITE_NAME} — Custom Patches for Bold Brands`, template: `%s` },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/brand/markhor-icon-32.png", sizes: "32x32", type: "image/png" }, { url: "/brand/markhor-icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/brand/markhor-icon-180.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#050B18" }, { color: "#081A36" }],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US" className={`${barlow.variable} ${inter.variable} ${marker.variable}`}>
      <body>{children}</body>
    </html>
  );
}
