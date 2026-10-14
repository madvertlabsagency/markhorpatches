import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";
import { updateMockupStatus } from "../actions";
import { AdminHeader, Flash, Table, inputCls } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";

export default async function AdminMockups({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; status?: string }> }) {
  await requireStaff("mockups:read");
  const sp = await searchParams;
  const rows = await prisma.mockupRequest.findMany({ where: sp.status ? { status: sp.status as never } : {}, orderBy: { createdAt: "desc" }, take: 100, include: { patchType: true, artworkFile: true } });
  return (
    <div>
      <AdminHeader title="Mockup requests" description="Free mockup submissions. Each one has a linked order — open it to upload the proof." />
      <Flash sp={sp} />
      <div className="mb-4 flex gap-2 text-sm">{["", "NEW", "IN_DESIGN", "PROOF_SENT", "CONVERTED", "CLOSED"].map((s) => <Link key={s} href={s ? `?status=${s}` : "?"} className={`rounded-full px-3 py-1.5 font-semibold ${sp.status === s || (!sp.status && !s) ? "bg-navy text-white" : "bg-white ring-1 ring-line"}`}>{s || "All"}</Link>)}</div>
      <Table head={["Request", "Contact", "Patch", "Artwork", "Deadline", "Status", "Order"]} empty="No mockup requests yet.">
        {rows.map((m) => (
          <tr key={m.id}>
            <td className="px-4 py-3"><p className="font-semibold">{m.requestNumber}</p><p className="text-xs text-slate">{formatDate(m.createdAt)}</p></td>
            <td className="px-4 py-3">{m.name}<p className="text-xs text-slate">{m.email}{m.company ? ` · ${m.company}` : ""}</p></td>
            <td className="px-4 py-3 text-xs">{m.patchType?.shortName ?? "—"} · {m.approxSize ?? "size?"} · {m.quantity ?? "qty?"}</td>
            <td className="px-4 py-3 text-xs">{m.artworkFile ? <a className="text-patch" href={`/api/artwork/${m.artworkFile.id}`}>{m.artworkFile.originalFilename}</a> : <Badge>Sending later</Badge>}</td>
            <td className="px-4 py-3 text-xs">{m.deadline ? formatDate(m.deadline) : "—"}</td>
            <td className="px-4 py-3">
              <form action={updateMockupStatus} className="flex gap-1"><input type="hidden" name="id" value={m.id} /><select name="status" defaultValue={m.status} className={`${inputCls} h-8 w-32 text-xs`} aria-label="Status">{["NEW", "IN_DESIGN", "PROOF_SENT", "CONVERTED", "CLOSED"].map((s) => <option key={s}>{s}</option>)}</select><button className="rounded bg-navy px-2 text-xs text-white">Set</button></form>
            </td>
            <td className="px-4 py-3">{m.orderId && <Link href={`/admin/orders/${m.orderId}`} className="font-semibold text-patch">Open →</Link>}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
