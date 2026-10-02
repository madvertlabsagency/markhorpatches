import Image from "next/image";
import { BadgeCheck, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReviewCardData {
  id: string;
  customerName: string;
  company: string | null;
  rating: number;
  title: string | null;
  body: string;
  photoUrl: string | null;
  verified: boolean;
  patchType: string | null;
  isSample: boolean;
}

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("flex gap-0.5 text-gold", className)} role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn("h-4 w-4", i < rating ? "fill-current" : "opacity-25")} aria-hidden />
      ))}
    </span>
  );
}

export function ReviewCard({ r, className }: { r: ReviewCardData; className?: string }) {
  return (
    <article className={cn("relative flex h-full flex-col rounded-[var(--radius-patch)] bg-white p-6 shadow-lift ring-1 ring-navy/5", className)}>
      {r.isSample && <p className="mb-3 inline-flex w-fit rounded-full bg-gold/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#7a5200]">Sample review — replace before launch</p>}
      <Stars rating={r.rating} />
      {r.title && <h3 className="mt-3 font-display text-xl font-extrabold uppercase leading-tight text-navy">{r.title}</h3>}
      <p className="mt-2 flex-1 leading-relaxed text-navy/80">“{r.body}”</p>
      {r.photoUrl && (
        <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-xl">
          <Image src={r.photoUrl} alt={`Photo from ${r.customerName}'s order`} fill className="object-cover" sizes="320px" />
        </div>
      )}
      <footer className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4 text-sm">
        <div>
          <p className="font-semibold text-navy">{r.customerName}</p>
          {r.company && <p className="text-slate">{r.company}</p>}
        </div>
        <div className="text-right">
          {r.verified && (
            <p className="flex items-center gap-1 font-semibold text-success">
              <BadgeCheck className="h-4 w-4" aria-hidden /> Verified order
            </p>
          )}
          {r.patchType && <p className="text-xs text-slate">{r.patchType}</p>}
        </div>
      </footer>
    </article>
  );
}
