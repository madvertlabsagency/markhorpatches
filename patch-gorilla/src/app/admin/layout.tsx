import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { ROLE_PERMISSIONS } from "@/lib/auth/rbac";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "@/components/brand/Logo";
import { AdminNav } from "@/components/admin/AdminNav";
import { ToastProvider } from "@/components/ui/Toast";
import { titleCase } from "@/lib/utils";

export const metadata = { title: "Admin | Patch Gorilla", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  return (
    <ToastProvider>
      <div className="min-h-screen bg-ice lg:grid lg:grid-cols-[250px_1fr]">
        <aside className="bg-midnight text-white lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
          <div className="flex items-center justify-between p-5 lg:block">
            <Logo tone="light" href="/admin" className="w-[150px]" />
            <p className="hidden text-xs text-white/40 lg:mt-2 lg:block">Admin console</p>
          </div>
          <details className="px-3 pb-4 lg:hidden"><summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-white/80">Menu</summary><AdminNav allowed={ROLE_PERMISSIONS[user.role]} /></details>
          <div className="hidden px-3 pb-6 lg:block"><AdminNav allowed={ROLE_PERMISSIONS[user.role]} /></div>
          <div className="hidden border-t border-white/10 p-5 text-xs text-white/50 lg:block">
            <p className="font-semibold text-white/80">{user.name ?? user.email}</p>
            <p>{titleCase(user.role)}</p>
            <div className="mt-3 flex gap-3"><Link href="/" className="hover:text-turquoise">View site</Link><form action={logoutAction}><button className="hover:text-turquoise">Sign out</button></form></div>
          </div>
        </aside>
        <main id="main" className="min-w-0 p-4 sm:p-8">{children}</main>
      </div>
    </ToastProvider>
  );
}
