"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, FileCheck2, Images, Layers, MessageSquareQuote, Package, PlugZap, Settings, Sparkles, Tags, Users, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: BarChart3, perm: "dashboard:view" },
  { href: "/admin/orders", label: "Orders", icon: Package, perm: "orders:read" },
  { href: "/admin/mockups", label: "Mockups", icon: Sparkles, perm: "mockups:read" },
  { href: "/admin/proofs", label: "Proofs", icon: FileCheck2, perm: "proofs:write" },
  { href: "/admin/customers", label: "Customers", icon: Users, perm: "customers:read" },
  { href: "/admin/products", label: "Patch types", icon: Boxes, perm: "catalog:write" },
  { href: "/admin/pricing", label: "Pricing & options", icon: Layers, perm: "pricing:write" },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquareQuote, perm: "reviews:write" },
  { href: "/admin/gallery", label: "Gallery", icon: Images, perm: "gallery:write" },
  { href: "/admin/content", label: "Content & FAQs", icon: FileText, perm: "content:write" },
  { href: "/admin/coupons", label: "Coupons", icon: Tags, perm: "coupons:write" },
  { href: "/admin/integrations", label: "Integrations & logs", icon: PlugZap, perm: "integrations:read" },
  { href: "/admin/settings", label: "Site settings", icon: Settings, perm: "settings:write" },
] as const;

export function AdminNav({ allowed }: { allowed: string[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="space-y-0.5">
      {ADMIN_NAV.filter((n) => allowed.includes(n.perm)).map((n) => {
        const active = n.href === "/admin" ? path === n.href : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", active ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white")}>
            <n.icon className={cn("h-4 w-4", active && "text-turquoise")} aria-hidden /> {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
