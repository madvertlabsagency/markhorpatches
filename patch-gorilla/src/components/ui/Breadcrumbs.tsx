import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

export function Breadcrumbs({ items, dark, className }: { items: { name: string; path: string }[]; dark?: boolean; className?: string }) {
  const all = [{ name: "Home", path: "/" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
        <ol className="flex flex-wrap items-center gap-1.5">
          {all.map((it, i) => (
            <li key={it.path} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className={cn("h-3.5 w-3.5", dark ? "text-white/40" : "text-slate/50")} aria-hidden />}
              {i === all.length - 1 ? (
                <span aria-current="page" className={dark ? "text-white/90" : "text-navy"}>{it.name}</span>
              ) : (
                <Link href={it.path} className={cn("transition-colors", dark ? "text-white/55 hover:text-turquoise" : "text-slate hover:text-patch")}>{it.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(all)} />
    </>
  );
}
