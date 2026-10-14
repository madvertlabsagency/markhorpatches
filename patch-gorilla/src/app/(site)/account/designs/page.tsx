import Link from "next/link";
import { requireCustomer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { configurationInclude, describeConfiguration } from "@/lib/domain/configurations";
import { designToCartAction, deleteDesignAction } from "@/app/actions/account";
import { PatchArt } from "@/components/brand/PatchArt";
import { EmptyState } from "@/components/ui/States";
import { ButtonLink } from "@/components/ui/Button";

export default async function SavedDesigns() {
  const { customer } = await requireCustomer("/account/designs");
  if (!customer) return <EmptyState title="Confirm your email" />;
  const designs = await prisma.patchConfiguration.findMany({ where: { customerId: customer.id, isSaved: true }, include: configurationInclude, orderBy: { updatedAt: "desc" } });
  if (!designs.length) return <EmptyState title="No saved designs." description="Save a design from the patch builder to reorder it any time." action={<ButtonLink href="/build-your-patch" arrow>Open the builder</ButtonLink>} />;
  return (
    <div>
      <h2 className="font-display text-3xl font-extrabold uppercase">Saved designs</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {designs.map((c) => {
          const d = describeConfiguration(c);
          return (
            <li key={c.id} className="rounded-2xl bg-white p-5 ring-1 ring-line">
              <div className="flex gap-4">
                <div className="w-14 shrink-0"><PatchArt code={c.patchType.code} title="" /></div>
                <div><p className="font-semibold">{c.name ?? d.patchType}</p><p className="text-sm text-slate">{d.size} · {d.quantity.toLocaleString("en-US")} pcs · {d.backing}</p></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <form action={designToCartAction}><input type="hidden" name="id" value={c.id} /><button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white">Add to cart</button></form>
                <Link href={`/build-your-patch?saved=${c.id}`} className="rounded-full px-4 py-2 text-sm font-semibold text-patch hover:bg-ice">Edit</Link>
                <form action={deleteDesignAction}><input type="hidden" name="id" value={c.id} /><button className="rounded-full px-4 py-2 text-sm font-semibold text-slate hover:text-danger">Remove</button></form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
