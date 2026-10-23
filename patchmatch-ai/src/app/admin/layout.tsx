import { DashboardShell } from "@/components/layout/DashboardShell";
import type { NavGroup } from "@/components/layout/DashNav";
import { requireAdmin } from "@/lib/auth/session";
import { operationalQueues } from "@/lib/admin/metrics";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin("admin:view");
  const q = await operationalQueues();
  const nav: NavGroup[] = [
    { items: [{ label: "Command center", href: "/admin", icon: "Gauge", exact: true }, { label: "AI assistant", href: "/admin/assistant", icon: "Sparkles" }] },
    {
      title: "Marketplace",
      items: [
        { label: "RFQ review", href: "/admin/rfq-review", icon: "ClipboardCheck", badge: q.review },
        { label: "All RFQs", href: "/admin/rfqs", icon: "FileText" },
        { label: "Qualification", href: "/admin/qualification", icon: "FileSearch" },
        { label: "Matching", href: "/admin/matching", icon: "Radar", badge: q.manual },
        { label: "Opportunities", href: "/admin/opportunities", icon: "Store" },
        { label: "Unlocks", href: "/admin/unlocks", icon: "Unlock" },
        { label: "Quotes", href: "/admin/quotes", icon: "MessageSquareQuote" },
        { label: "Messages", href: "/admin/messages", icon: "MessagesSquare", badge: q.reports },
      ],
    },
    {
      title: "People",
      items: [
        { label: "Buyers", href: "/admin/buyers", icon: "Users" },
        { label: "Sellers", href: "/admin/sellers", icon: "Factory" },
        { label: "Seller verification", href: "/admin/seller-verification", icon: "BadgeCheck", badge: q.verification },
      ],
    },
    {
      title: "Money",
      items: [
        { label: "Payments & invoices", href: "/admin/payments", icon: "CreditCard", badge: q.failedPayments },
        { label: "Refunds", href: "/admin/refunds", icon: "RotateCcw" },
        { label: "Disputes & claims", href: "/admin/disputes", icon: "Scale", badge: q.claims },
        { label: "Pricing", href: "/admin/pricing", icon: "Tags" },
      ],
    },
    {
      title: "Insights",
      items: [
        { label: "Analytics", href: "/admin/analytics", icon: "BarChart3" },
        { label: "Marketing", href: "/admin/marketing", icon: "Megaphone" },
        { label: "Fraud", href: "/admin/fraud", icon: "ShieldBan" },
      ],
    },
    {
      title: "System",
      items: [
        { label: "Notifications & jobs", href: "/admin/notifications", icon: "Bell", badge: q.deadJobs },
        { label: "Audit logs", href: "/admin/audit-logs", icon: "ScrollText" },
        { label: "Roles", href: "/admin/roles", icon: "KeyRound" },
        { label: "Settings", href: "/admin/settings", icon: "SlidersHorizontal" },
      ],
    },
  ];
  return (
    <DashboardShell area="Admin" nav={nav} user={user} orgName="PatchMatch operations" notificationsHref="/admin/inbox" defaultTheme="dark">
      {children}
    </DashboardShell>
  );
}
