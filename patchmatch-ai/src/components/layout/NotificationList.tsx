import Link from "next/link";
import { Bell } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui/primitives";
import { ActionForm } from "@/components/ui/client";
import { markNotificationsReadAction } from "@/app/actions/buyer";
import { relativeTime, cn } from "@/lib/utils";

export async function NotificationList({ userId }: { userId: string }) {
  const items = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = items.filter((i) => !i.readAt).length;
  return (
    <>
      <PageHeader title="Notifications" description={unread ? `${unread} unread` : "You're all caught up."} actions={unread ? <ActionForm action={async () => { "use server"; return markNotificationsReadAction(); }} submitLabel="Mark all as read" submitVariant="secondary" submitSize="sm" /> : undefined} />
      {items.length === 0 ? <EmptyState icon={Bell} title="No notifications yet" /> : (
        <ul className="card divide-y divide-line">
          {items.map((n) => {
            const body = (
              <div className={cn("flex gap-3 px-5 py-4", !n.readAt && "bg-electric/5")}>
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.readAt ? "bg-line" : "bg-electric")} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="text-sm text-muted">{n.body}</p>
                  <p className="mt-1 text-xs text-muted">{relativeTime(n.createdAt)}</p>
                </div>
              </div>
            );
            return <li key={n.id}>{n.link ? <Link href={n.link} className="block hover:bg-surface-2/60">{body}</Link> : body}</li>;
          })}
        </ul>
      )}
    </>
  );
}
