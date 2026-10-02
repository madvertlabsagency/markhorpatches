"use client";
import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Copy, Pencil, Trash2, ShoppingBag } from "lucide-react";
import { duplicateCartItemAction, removeCartItemAction, saveForLaterAction } from "@/app/actions/cart";
import { useToast } from "@/components/ui/Toast";

export function CartLineActions({ itemId, saved }: { itemId: string; saved: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast({ tone: "error", title: "Something went wrong", description: r.error });
      else toast({ tone: "success", title: msg });
      router.refresh();
    });
  const btn = "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-navy transition hover:bg-ice disabled:opacity-50";
  return (
    <div className="flex flex-wrap gap-1" aria-busy={pending}>
      <Link href={`/build-your-patch?edit=${itemId}`} className={btn}><Pencil className="h-4 w-4" aria-hidden /> Edit</Link>
      <button className={btn} disabled={pending} onClick={() => run(() => duplicateCartItemAction(itemId), "Duplicated")}><Copy className="h-4 w-4" aria-hidden /> Duplicate</button>
      <button className={btn} disabled={pending} onClick={() => run(() => saveForLaterAction(itemId, !saved), saved ? "Moved to cart" : "Saved for later")}>
        {saved ? <ShoppingBag className="h-4 w-4" aria-hidden /> : <Bookmark className="h-4 w-4" aria-hidden />} {saved ? "Move to cart" : "Save for later"}
      </button>
      <button className={`${btn} hover:bg-danger/10 hover:text-danger`} disabled={pending} onClick={() => run(() => removeCartItemAction(itemId), "Removed")}><Trash2 className="h-4 w-4" aria-hidden /> Remove</button>
    </div>
  );
}
