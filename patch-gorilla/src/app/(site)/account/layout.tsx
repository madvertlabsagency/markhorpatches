import { requireUser } from "@/lib/auth/session";
import { logoutAction } from "@/app/actions/auth";
import { Container } from "@/components/ui/Section";
import { AccountNav } from "@/components/account/AccountNav";
import { VerifyBanner } from "@/components/account/VerifyBanner";
import { HornMark } from "@/components/brand/marks";

export const metadata = { title: "My account | Markhor Patches", robots: { index: false, follow: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  return (
    <section data-header-theme="light" className="min-h-screen bg-offwhite pb-24 pt-[calc(var(--header-h)+2rem)]">
      <Container size="2xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2"><HornMark className="h-5 text-electric" /><span className="eyebrow text-slate">My account</span></div>
            <h1 className="display text-[clamp(2.6rem,6vw,4.2rem)]">Hey{user.name ? `, ${user.name.split(" ")[0]}` : ""}.</h1>
          </div>
          <form action={logoutAction}><button className="text-sm font-semibold text-slate hover:text-navy">Sign out</button></form>
        </div>
        {!user.emailVerified && <div className="mb-8"><VerifyBanner email={user.email} /></div>}
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside><AccountNav /></aside>
          <div className="min-w-0">{children}</div>
        </div>
      </Container>
    </section>
  );
}
