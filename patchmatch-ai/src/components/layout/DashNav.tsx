"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import * as RDialog from "@radix-ui/react-dialog";
import {
  LayoutDashboard, FileText, Radar, MessageSquareQuote, MessagesSquare, Image, Bell, Settings, Inbox, Unlock, Receipt, CreditCard, ShieldAlert, BarChart3, Wrench, Images, BadgeCheck, Users, Building2, ClipboardCheck, Gauge, Store, Tags, Wallet, RotateCcw, Scale, Megaphone, ShieldBan, ScrollText, KeyRound, SlidersHorizontal, Sparkles, Search, Menu, X, Sun, Moon, Circle, Briefcase, Factory, Calculator, FileSearch,
} from "lucide-react";

const Icons = { LayoutDashboard, FileText, Radar, MessageSquareQuote, MessagesSquare, Image, Bell, Settings, Inbox, Unlock, Receipt, CreditCard, ShieldAlert, BarChart3, Wrench, Images, BadgeCheck, Users, Building2, ClipboardCheck, Gauge, Store, Tags, Wallet, RotateCcw, Scale, Megaphone, ShieldBan, ScrollText, KeyRound, SlidersHorizontal, Sparkles, Search, Menu, X, Sun, Moon, Circle, Briefcase, Factory, Calculator, FileSearch };
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

export type IconName = keyof typeof Icons;
export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  badge?: number;
  exact?: boolean;
}
export interface NavGroup {
  title?: string;
  items: NavItem[];
}

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
}

export function DashNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="space-y-5">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.title && <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">{g.title}</p>}
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const Icon = (Icons[item.icon] ?? Icons.Circle) as React.ComponentType<{ className?: string }>;
              const active = isActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition", active ? "bg-electric/10 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg")}
                  >
                    <Icon className={cn("h-4.5 w-4.5", active && "text-electric")} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {!!item.badge && <span className="tabular rounded-full bg-electric px-1.5 text-[11px] font-bold text-navy">{item.badge}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function MobileDashNav({ groups, area, orgName }: { groups: NavGroup[]; area: string; orgName?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <RDialog.Root open={open} onOpenChange={setOpen}>
      <RDialog.Trigger className="grid h-10 w-10 place-items-center rounded-xl border border-line lg:hidden" aria-label="Open navigation">
        <Icons.Menu className="h-5 w-5" />
      </RDialog.Trigger>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-sm" />
        <RDialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,86vw)] flex-col bg-surface text-fg shadow-2xl">
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <Logo />
            <RDialog.Title className="sr-only">{area} navigation</RDialog.Title>
            <RDialog.Description className="sr-only">Navigate the {area.toLowerCase()} area</RDialog.Description>
            <RDialog.Close className="rounded-lg p-2 hover:bg-surface-2" aria-label="Close">
              <Icons.X className="h-5 w-5" />
            </RDialog.Close>
          </div>
          {orgName && <p className="px-5 pt-4 text-sm font-semibold">{orgName}</p>}
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <DashNav groups={groups} onNavigate={() => setOpen(false)} />
          </div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export function ThemeToggle({ theme }: { theme: "light" | "dark" }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = `pm_dash_theme=${theme === "dark" ? "light" : "dark"}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
      className="grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-fg"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? <Icons.Sun className="h-5 w-5" /> : <Icons.Moon className="h-5 w-5" />}
    </button>
  );
}
