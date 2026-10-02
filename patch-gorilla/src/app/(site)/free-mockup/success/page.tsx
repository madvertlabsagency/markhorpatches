import { getSettings } from "@/lib/settings";
import { Container } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { Crown, HandArrow } from "@/components/brand/marks";
import { ProcessSteps } from "@/components/home/ProcessSteps";

export const metadata = { title: "Mockup requested | Patch Gorilla", robots: { index: false } };

export default async function MockupSuccess({ searchParams }: { searchParams: Promise<{ ref?: string; o?: string; t?: string }> }) {
  const sp = await searchParams;
  const settings = await getSettings();
  return (
    <section data-header-theme="dark" className="theme-dark relative min-h-screen overflow-hidden pb-24 pt-[calc(var(--header-h)+4rem)]">
      <div className="grid-texture-dark pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <Container size="lg" className="relative text-center">
        <Crown className="mx-auto h-14 text-turquoise" />
        <h1 className="display mt-6 text-[clamp(3rem,8vw,6rem)]">Your artwork is officially in <span className="text-gradient">Gorilla hands.</span></h1>
        {sp.ref && <p className="mt-4 text-white/70">Request <strong className="text-white">{sp.ref}</strong> · confirmation sent to your inbox</p>}
        <p className="mx-auto mt-6 max-w-xl text-lg text-white/75">{settings.promises.mockup24HourPromise ? "Get your digital mockup within 24 hours." : "A designer is on it. We'll email you as soon as your mockup is ready."} Nothing goes into production until you approve it.</p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          {sp.o && sp.t && <ButtonLink href={`/order/${sp.o}?t=${sp.t}`} arrow>Track your request</ButtonLink>}
          <ButtonLink href="/register" variant="outline-light">Create an account</ButtonLink>
        </div>
        <HandArrow direction="down-right" className="mx-auto mt-10 h-14 w-14 text-turquoise" />
        <p className="hand -rotate-2 text-2xl text-turquoise">What happens next</p>
      </Container>
      <Container size="2xl" className="relative mt-10"><ProcessSteps dark /></Container>
    </section>
  );
}
