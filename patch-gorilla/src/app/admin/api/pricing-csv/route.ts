import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";

/** CSV export of the full price matrix (re-importable). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "pricing:write")) return new Response("Forbidden", { status: 403 });
  const rows = await prisma.priceMatrix.findMany({ include: { patchType: true, sizeTier: true, quantityTier: true }, orderBy: [{ patchType: { sortOrder: "asc" } }, { sizeTier: { maxSizeIn: "asc" } }, { quantityTier: { minQuantity: "asc" } }] });
  const csv = ["patch_type_code,size_max_in,min_quantity,unit_price_usd,active", ...rows.map((r) => `${r.patchType.code},${r.sizeTier.maxSizeIn},${r.quantityTier.minQuantity},${(r.unitPriceCents / 100).toFixed(2)},${r.active}`)].join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="patch-gorilla-prices-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
