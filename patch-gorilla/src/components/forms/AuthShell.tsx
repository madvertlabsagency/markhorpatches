import { Crown } from "@/components/brand/marks";
import { PatchArt } from "@/components/brand/PatchArt";

export function AuthShell({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section data-header-theme="dark" className="theme-dark relative min-h-screen overflow-hidden pb-20 pt-[calc(var(--header-h)+3rem)]">
      <div className="grid-texture-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div className="pointer-events-none absolute -right-20 top-24 hidden w-80 rotate-12 opacity-80 lg:block" aria-hidden><PatchArt code="EMBROIDERED" title="" /></div>
      <div className="relative mx-auto w-full max-w-md px-4">
        <Crown className="h-8 text-turquoise" />
        <h1 className="display mt-4 text-6xl">{title}</h1>
        {sub && <p className="mt-2 text-white/70">{sub}</p>}
        <div className="mt-8 rounded-[1.75rem] bg-white p-6 text-navy shadow-2xl sm:p-8">{children}</div>
      </div>
    </section>
  );
}
