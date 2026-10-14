import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { createPatchType } from "../actions";
import { AdminHeader, Card, Flash, Table, btnCls, inputCls, Label } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff("catalog:write");
  const sp = await searchParams;
  const types = await prisma.patchType.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { prices: true, backings: true, borders: true, extras: true } }, product: true } });
  return (
    <div className="space-y-6">
      <AdminHeader title="Patch types & product pages" description="Configurator rules (sizes, minimums, compatible options) and the marketing page for each patch type." />
      <Flash sp={sp} />
      <Table head={["Patch type", "Status", "Sizes", "Min qty", "Production", "Options", "Prices", ""]}>
        {types.map((t) => (
          <tr key={t.id}>
            <td className="px-4 py-3"><p className="font-semibold">{t.name}</p><p className="text-xs text-slate">{t.code} · /{t.slug}</p></td>
            <td className="px-4 py-3"><Badge tone={t.active ? "success" : "neutral"}>{t.active ? "Active" : "Hidden"}</Badge></td>
            <td className="px-4 py-3">{t.minSizeIn}&quot;–{t.maxSizeIn}&quot;</td>
            <td className="px-4 py-3">{t.minQuantity}</td>
            <td className="px-4 py-3">{t.productionDays}d / rush {t.rushProductionDays}d</td>
            <td className="px-4 py-3 text-xs">{t._count.backings} backings · {t._count.borders} borders · {t._count.extras} extras</td>
            <td className="px-4 py-3">{t._count.prices}</td>
            <td className="px-4 py-3"><Link href={`/admin/products/${t.id}`} className="font-semibold text-patch">Edit →</Link></td>
          </tr>
        ))}
      </Table>
      <Card title="Add a patch type">
        <form action={createPatchType} className="grid gap-3 sm:grid-cols-4">
          <div><Label htmlFor="np-code">Code</Label><input id="np-code" name="code" placeholder="GLITTER" className={inputCls} required /></div>
          <div><Label htmlFor="np-name">Name</Label><input id="np-name" name="name" placeholder="Glitter Patches" className={inputCls} required /></div>
          <div><Label htmlFor="np-slug">URL slug</Label><input id="np-slug" name="slug" placeholder="glitter-patches" className={inputCls} required /></div>
          <div className="flex items-end"><button className={btnCls}>Create (hidden)</button></div>
        </form>
      </Card>
    </div>
  );
}
