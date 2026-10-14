import Link from "next/link";
import { ORDER_STATUS_LABEL, statusTone } from "@/lib/orders/status";
import type { OrderStatus } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/Badge";
import { formatUSD } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { reorderAction } from "@/app/actions/account";

export function OrderRow({ o }: { o: { id: string; orderNumber: string; status: OrderStatus; totalCents: number; createdAt: Date; source: string; items: { productName: string; quantity: number }[] } }) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-white p-5 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-xl font-extrabold">{o.orderNumber}</p>
          <Badge tone={statusTone(o.status)}>{ORDER_STATUS_LABEL[o.status]}</Badge>
          {o.source === "FREE_MOCKUP" && <Badge>Free mockup</Badge>}
        </div>
        <p className="mt-1 text-sm text-slate">{o.items.map((i) => `${i.productName} × ${i.quantity.toLocaleString("en-US")}`).join(", ")} · {formatDate(o.createdAt)}</p>
      </div>
      <div className="flex items-center gap-3">
        {o.totalCents > 0 && <p className="font-semibold">{formatUSD(o.totalCents)}</p>}
        <Link href={`/account/orders/${o.id}`} className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">View</Link>
        <form action={reorderAction}><input type="hidden" name="orderId" value={o.id} /><button className="rounded-full px-3 py-2 text-sm font-semibold text-patch hover:bg-ice">Reorder</button></form>
      </div>
    </li>
  );
}
