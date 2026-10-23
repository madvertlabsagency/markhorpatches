import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { DemoBanner } from "@/components/demo/DemoBanner";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DemoBanner />
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
