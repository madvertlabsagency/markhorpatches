import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import type { NavGroup } from "@/components/layout/DashNav";
import { requireSeller } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { unreadCount } from "@/lib/domain/messages";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const { user, org, seller } = await requireSeller();
  const [unread, available] = await Promise.all([
    unreadCount({ sellerId: seller.id }),
    seller.verificationStatus === "VERIFIED" ? prisma.rfqMatch.count({ where: { sellerId: seller.id, eligible: true, status: { in: ["NOTIFIED", "APPROVED"] }, rfq: { opportunity: { status: "AVAILABLE" }, unlocks: { none: { sellerId: seller.id, status: "ACTIVE" } } } } }) : 0,
  ]);
  const nav: NavGroup[] = [
    { items: [{ label: "Dashboard", href: "/seller/dashboard", icon: "LayoutDashboard" }, { label: "Live marketplace", href: "/live", icon: "Activity" }, { label: "Guide", href: "/guide/sellers", icon: "BookOpen" }] },
    {
      title: "Opportunities",
      items: [
        { label: "Opportunities", href: "/seller/opportunities", icon: "Inbox", badge: available },
        { label: "Matches", href: "/seller/matches", icon: "Radar" },
        { label: "Unlocked RFQs", href: "/seller/unlocked-rfqs", icon: "Unlock" },
        { label: "Quotes", href: "/seller/quotes", icon: "MessageSquareQuote" },
        { label: "Messages", href: "/seller/messages", icon: "MessagesSquare", badge: unread },
      ],
    },
    {
      title: "Money",
      items: [
        { label: "Billing & credits", href: "/seller/billing", icon: "Wallet" },
        { label: "Transactions", href: "/seller/transactions", icon: "Receipt" },
        { label: "Quality claims", href: "/seller/quality-claims", icon: "ShieldAlert" },
        { label: "Analytics", href: "/seller/analytics", icon: "BarChart3" },
      ],
    },
    {
      title: "Company",
      items: [
        { label: "Capabilities", href: "/seller/capabilities", icon: "Wrench" },
        { label: "Portfolio", href: "/seller/portfolio", icon: "Images" },
        { label: "Verification", href: "/seller/verification", icon: "BadgeCheck" },
        { label: "Team", href: "/seller/team", icon: "Users" },
        { label: "Settings", href: "/seller/settings", icon: "Settings" },
      ],
    },
  ];
  const banner =
    seller.verificationStatus !== "VERIFIED" ? (
      <div className="flex flex-wrap items-center justify-center gap-2 border-b border-electric/25 bg-electric/8 px-4 py-2 text-sm">
        <span>
          {seller.verificationStatus === "PENDING_REVIEW" ? "Your application is under review." : seller.verificationStatus === "INFO_REQUIRED" ? "We need more information to verify your business." : seller.verificationStatus === "SUSPENDED" ? "Your account is suspended." : seller.verificationStatus === "REJECTED" ? "Your application was not approved." : "Complete verification to access RFQs."}
        </span>
        <Link href="/seller/verification" className="font-semibold text-electric">View verification →</Link>
      </div>
    ) : undefined;
  return (
    <DashboardShell area="Seller" nav={nav} user={user} orgName={org.name} notificationsHref="/seller/notifications" banner={banner}>
      {children}
    </DashboardShell>
  );
}
