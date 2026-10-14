import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/api", "/cart", "/checkout", "/order", "/invoice", "/search"] }],
    sitemap: siteUrl("/sitemap.xml"),
  };
}
