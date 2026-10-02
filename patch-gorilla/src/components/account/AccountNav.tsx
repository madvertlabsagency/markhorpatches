"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, FileCheck2, Image as ImageIcon, LayoutDashboard, Package, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/account", label: "Overview", icon: LayoutDashboard },
  { href: "/account/orders", label: "Orders & quotes", icon: Package },
  { href: "/account/proofs", label: "Proofs", icon: FileCheck2 },
  { href: "/account/designs", label: "Saved designs", icon: Bookmark },
  { href: "/account/artwork", label: "Artwork library", icon: ImageIcon },
  { href: "/account/settings", label: "Profile & addresses", icon: Settings },
];

export function AccountNav() {
  const path = usePathname();
  return (
    <nav aria-label="Account" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
      {NAV.map((n) => {
        const active = n.href === "/account" ? path === n.href : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={cn("flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition lg:rounded-xl", active ? "bg-navy text-white" : "text-navy hover:bg-ice")}>
            <n.icon className="h-4 w-4" aria-hidden /> {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
