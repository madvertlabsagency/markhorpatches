import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileActionBar } from "@/components/layout/MobileActionBar";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { ClientChrome } from "@/components/layout/ClientChrome";
import { JsonLd } from "@/components/JsonLd";
import { getSettings } from "@/lib/settings";
import { getStartingPrices } from "@/lib/catalog";
import { cartCount } from "@/lib/cart-session";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/rbac";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, prices, count, user] = await Promise.all([getSettings(), getStartingPrices(), cartCount(), getCurrentUser()]);
  return (
    <ClientChrome>
      <Header cartCount={count} signedIn={!!user} isStaff={isStaff(user?.role)} startingPrices={prices} />
      <main id="main">{children}</main>
      <Footer settings={settings} />
      <MobileActionBar />
      <WhatsAppButton number={settings.brand.whatsappNumber} />
      <JsonLd data={organizationJsonLd({ email: settings.brand.supportEmail || undefined, sameAs: Object.values(settings.brand.socials).filter(Boolean) })} />
      <JsonLd data={websiteJsonLd()} />
    </ClientChrome>
  );
}
