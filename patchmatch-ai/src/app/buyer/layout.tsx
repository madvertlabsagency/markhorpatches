import { DashboardShell } from "@/components/layout/DashboardShell";
import type { NavGroup } from "@/components/layout/DashNav";
import { requireBuyer } from "@/lib/auth/session";
import { unreadCount } from "@/lib/domain/messages";
import { VerifyBanner } from "@/components/layout/VerifyBanner";

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const { user, org } = await requireBuyer();
  const unread = await unreadCount({ buyerOrgId: org.id });
  const nav: NavGroup[] = [
    { items: [{ label: "Dashboard", href: "/buyer/dashboard", icon: "LayoutDashboard" }] },
    {
      title: "Sourcing",
      items: [
        { label: "My RFQs", href: "/buyer/rfqs", icon: "FileText" },
        { label: "Matches", href: "/buyer/matches", icon: "Radar" },
        { label: "Quotes", href: "/buyer/quotes", icon: "MessageSquareQuote" },
        { label: "Messages", href: "/buyer/messages", icon: "MessagesSquare", badge: unread },
        { label: "Artwork", href: "/buyer/artwork", icon: "Image" },
      ],
    },
    { title: "Account", items: [{ label: "Notifications", href: "/buyer/notifications", icon: "Bell" }, { label: "Settings", href: "/buyer/settings", icon: "Settings" }] },
  ];
  return (
    <DashboardShell area="Buyer" nav={nav} user={user} orgName={org.name} notificationsHref="/buyer/notifications" banner={!user.emailVerifiedAt ? <VerifyBanner /> : undefined}>
      {children}
    </DashboardShell>
  );
}
