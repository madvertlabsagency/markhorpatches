import { HornMark, MountainContours } from "@/components/brand/marks";
import { LogoEmblem } from "@/components/brand/Logo";

export function AuthShell({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section data-header-theme="dark" className="theme-dark relative min-h-screen overflow-hidden pb-20 pt-[calc(var(--header-h)+3rem)]">
      <div className="grid-texture-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <MountainContours className="absolute inset-x-0 bottom-0 h-2/3 w-full text-turquoise/25" lines={8} />
      <div className="pointer-events-none absolute right-[6%] top-28 hidden w-72 opacity-25 lg:block" aria-hidden><LogoEmblem className="w-full" sizes="320px" /></div>
      <div className="relative mx-auto w-full max-w-md px-4">
        <HornMark className="h-8 text-turquoise" />
        <h1 className="display mt-4 text-6xl">{title}</h1>
        {sub && <p className="mt-2 text-white/70">{sub}</p>}
        <div className="mt-8 rounded-[1.75rem] bg-white p-6 text-navy shadow-2xl sm:p-8">{children}</div>
      </div>
    </section>
  );
}
