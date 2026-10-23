import Link from "next/link";
import { cookies } from "next/headers";
import { Bell, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Avatar, Badge } from "@/components/ui/primitives";
import { prisma } from "@/lib/db";
import { logoutAction } from "@/app/actions/auth";
import { isDemoMode } from "@/lib/env";
import { DashNav, MobileDashNav, ThemeToggle, type NavGroup } from "./DashNav";
import { cn } from "@/lib/utils";

export async function DashboardShell({
  area,
  nav,
  user,
  orgName,
  children,
  notificationsHref,
  defaultTheme = "light",
  banner,
}: {
  area: "Buyer" | "Seller" | "Admin";
  nav: NavGroup[];
  user: { id: string; name: string | null; email: string };
  orgName?: string;
  children: React.ReactNode;
  notificationsHref: string;
  defaultTheme?: "light" | "dark";
  banner?: React.ReactNode;
}) {
  const theme = (await cookies()).get("pm_dash_theme")?.value ?? defaultTheme;
  const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null } });
  return (
    <div className={cn("min-h-dvh bg-bg text-fg", theme === "dark" && "dark")}>
      {isDemoMode() && <div className="bg-violet-600 px-4 py-1 text-center text-xs font-semibold text-white">Demo environment — all data is fictional.</div>}
      <div className="flex">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
          <div className="flex h-16 items-center gap-2 border-b border-line px-5">
            <Link href="/" aria-label="PatchMatch AI home">
              <Logo />
            </Link>
          </div>
          <div className="px-5 pt-4">
            <Badge tone={area === "Admin" ? "dark" : "blue"}>{area}</Badge>
            {orgName && <p className="mt-2 truncate text-sm font-semibold" title={orgName}>{orgName}</p>}
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <DashNav groups={nav} />
          </div>
          <div className="border-t border-line p-3">
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              <Avatar name={user.name ?? user.email} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.name ?? "Account"}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
              <form action={logoutAction}>
                <button className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Sign out" title="Sign out">
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur-xl sm:px-6">
            <div className="flex items-center gap-3">
              <MobileDashNav groups={nav} area={area} orgName={orgName} />
              <Link href="/" className="lg:hidden" aria-label="Home">
                <Logo />
              </Link>
            </div>
            <div className="flex items-center gap-1.5">
              <ThemeToggle theme={theme as "light" | "dark"} />
              <Link href={notificationsHref} className="relative grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-fg" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
                <Bell className="h-5 w-5" />
                {unread > 0 && <span className="tabular absolute top-1.5 right-1.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-electric px-1 text-[10px] font-bold text-navy">{unread > 99 ? "99+" : unread}</span>}
              </Link>
              <form action={logoutAction} className="lg:hidden">
                <button className="grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-surface-2" aria-label="Sign out">
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </form>
            </div>
          </header>
          {banner}
          <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
