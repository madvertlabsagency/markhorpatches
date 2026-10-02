import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { PatchArt } from "@/components/brand/PatchArt";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main data-header-theme="dark" className="theme-dark relative grid min-h-screen place-items-center overflow-hidden px-4 py-16">
      <div className="grid-texture-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div className="relative text-center">
        <div className="mb-10 flex justify-center"><Logo tone="light" /></div>
        <div className="mx-auto w-40 -rotate-12 opacity-90"><PatchArt code="PVC" title="" /></div>
        <p className="display mt-8 text-[clamp(5rem,20vw,11rem)] leading-none text-white/10">404</p>
        <h1 className="display -mt-10 text-[clamp(2.4rem,7vw,4.5rem)]">Looks like this patch <span className="text-gradient">went missing.</span></h1>
        <p className="mx-auto mt-4 max-w-md text-white/70">The page you&apos;re after doesn&apos;t exist or has moved.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/" size="lg" arrow>Back to the good stuff</ButtonLink>
          <ButtonLink href="/build-your-patch" size="lg" variant="outline-light">Build your patch</ButtonLink>
        </div>
        <p className="mt-6 text-sm text-white/50">Looking for an order? <Link href="/track-order" className="text-turquoise underline">Track it here</Link>.</p>
      </div>
    </main>
  );
}
