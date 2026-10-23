import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/buyer", "/seller", "/api", "/rfq/", "/account", "/payments"] }],
    sitemap: siteUrl("/sitemap.xml"),
  };
}
