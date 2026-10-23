import type { Metadata } from "next";
import { requireSeller } from "@/lib/auth/session";
import { NotificationList } from "@/components/layout/NotificationList";

export const metadata: Metadata = { title: "Notifications" };

export default async function SellerNotifications() {
  const { user } = await requireSeller("/seller/notifications");
  return <NotificationList userId={user.id} />;
}
