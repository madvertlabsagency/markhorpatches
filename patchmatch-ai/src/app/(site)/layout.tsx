import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { isDemoMode } from "@/lib/env";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {isDemoMode() && (
        <div className="bg-violet-600 px-4 py-1.5 text-center text-xs font-semibold text-white">Demo environment — all companies, requests and transactions shown are fictional.</div>
      )}
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
