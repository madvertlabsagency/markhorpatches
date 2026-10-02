import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PatchArt } from "@/components/brand/PatchArt";
import { TiltCard } from "@/components/motion/TiltCard";
import { formatUSD } from "@/lib/money";

export interface PatchCardData {
  code: string;
  slug: string;
  name: string;
  shortDescription: string;
  bestUse: string;
  imageUrl: string | null;
  fromCents: number | null;
}

export function PatchCard({ p, index = 0 }: { p: PatchCardData; index?: number }) {
  return (
    <TiltCard className="h-full">
      <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-patch)] bg-white shadow-lift ring-1 ring-navy/5 transition-shadow duration-500 hover:shadow-[0_30px_60px_-24px_rgb(3_27_61/.35)]">
        <div className="relative grid aspect-[5/4] place-items-center overflow-hidden bg-ice">
          <div className="grid-texture absolute inset-0 opacity-70" aria-hidden />
          <span className="absolute left-4 top-4 font-display text-sm font-bold tracking-widest text-slate/70">{String(index + 1).padStart(2, "0")}</span>
          {p.imageUrl ? (
            <Image src={p.imageUrl} alt={`${p.name} example`} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="relative w-[58%] transition-transform duration-700 ease-[var(--ease-gorilla)] group-hover:-rotate-6 group-hover:scale-110">
              <PatchArt code={p.code} title={`${p.name} illustration`} />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <h3 className="display text-[2rem] text-navy">{p.name.replace(" Patches", "")}</h3>
          <p className="mt-1 text-sm text-slate">{p.shortDescription}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-patch">Best for: {p.bestUse}</p>
          <div className="mt-auto flex items-end justify-between gap-3 pt-5">
            {p.fromCents !== null ? (
              <p className="text-sm text-slate">
                From <span className="font-display text-2xl font-extrabold text-navy">{formatUSD(p.fromCents)}</span> / ea
              </p>
            ) : (
              <span />
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href={`/${p.slug}`} className="inline-flex h-11 items-center justify-center rounded-full border-2 border-navy/10 text-sm font-semibold text-navy transition hover:border-navy">
              Learn more
            </Link>
            <Link href={`/build-your-patch?type=${p.code}`} className="bg-signature inline-flex h-11 items-center justify-center gap-1 rounded-full text-sm font-semibold text-white transition hover:shadow-glow">
              Customize <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </article>
    </TiltCard>
  );
}
