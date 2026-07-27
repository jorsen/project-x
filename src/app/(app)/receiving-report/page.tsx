import Link from "next/link";
import Form from "next/form";
import { Pencil, PackageCheck } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/authz";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { FlashBanner } from "@/components/ui/FlashBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination, PAGE_SIZE, parseSkip } from "@/components/ui/Pagination";
import * as t from "@/components/ui/table";
import { deleteReceivingRecord } from "./actions";

export default async function ReceivingReportPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; skip?: string; flash?: string }>;
}) {
  const { q, skip: skipParam, flash } = await searchParams;
  const skip = parseSkip(skipParam);
  const session = await auth();
  const editable = canEdit(session?.user?.role);

  const where = q
    ? {
        OR: [
          { ics: { contains: q, mode: "insensitive" as const } },
          { partName: { contains: q, mode: "insensitive" as const } },
          { poNumber: { contains: q, mode: "insensitive" as const } },
          { supplier: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [records, total] = await Promise.all([
    prisma.receivingRecord.findMany({ where, orderBy: { no: "asc" }, skip, take: PAGE_SIZE }),
    prisma.receivingRecord.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="Receiving Report"
        description={`${total} record${total === 1 ? "" : "s"} total`}
        actions={
          editable && (
            <LinkButton href="/receiving-report/new">+ New record</LinkButton>
          )
        }
      />

      <FlashBanner message={flash} />

      <Form action="" className="mb-4 flex gap-2">
        <SearchInput defaultValue={q} placeholder="Search ICS, part name, PO#, supplier..." />
      </Form>

      {records.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title={q ? "No matching records" : "No receiving records yet"}
          description={
            q
              ? "Try a different search term."
              : "Add one manually, or import the E-Components workbook."
          }
        />
      ) : (
        <>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead className={t.thead}>
                <tr>
                  <th className={t.thNum}>No.</th>
                  <th className={t.th}>ICS</th>
                  <th className={t.th}>Part Name</th>
                  <th className={t.th}>Supplier</th>
                  <th className={t.th}>Maker</th>
                  <th className={t.thNum}>Price</th>
                  <th className={t.th}>PO#</th>
                  <th className={t.th}>ETD</th>
                  <th className={t.th}>ETA</th>
                  <th className={t.thNum}>Qty</th>
                  <th className={t.thNum}>In Transit</th>
                  {editable && <th className={t.th} />}
                </tr>
              </thead>
              <tbody className={t.tbody}>
                {records.map((r) => (
                  <tr key={r.id} className={t.tr}>
                    <td className={t.tdNum}>{r.no}</td>
                    <td className={`${t.td} font-medium text-slate-900`}>{r.ics}</td>
                    <td className={t.td}>{r.partName ?? <span className="text-slate-300">—</span>}</td>
                    <td className={t.td}>{r.supplier ?? <span className="text-slate-300">—</span>}</td>
                    <td className={t.td}>{r.maker ?? <span className="text-slate-300">—</span>}</td>
                    <td className={t.tdNum}>{r.price ?? <span className="text-slate-300">—</span>}</td>
                    <td className={t.td}>{r.poNumber ?? <span className="text-slate-300">—</span>}</td>
                    <td className={t.td}>{r.etd?.toISOString().slice(0, 10) ?? <span className="text-slate-300">—</span>}</td>
                    <td className={t.td}>{r.eta?.toISOString().slice(0, 10) ?? <span className="text-slate-300">—</span>}</td>
                    <td className={t.tdNum}>{r.qty ?? <span className="text-slate-300">—</span>}</td>
                    <td className={t.tdNum}>{r.inTransit ?? <span className="text-slate-300">—</span>}</td>
                    {editable && (
                      <td className={t.tdActions}>
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/receiving-report/${r.id}/edit`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-indigo-600"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Link>
                          <DeleteButton action={deleteReceivingRecord.bind(null, r.id)} />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            basePath="/receiving-report"
            searchParams={{ q }}
            skip={skip}
            count={records.length}
            total={total}
          />
        </>
      )}
    </div>
  );
}
