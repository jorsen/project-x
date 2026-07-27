import Link from "next/link";
import Form from "next/form";
import { Pencil, Boxes } from "lucide-react";
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
import { deleteEcompPart } from "./actions";

export default async function EcompPartsPage({
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
          { partNumber: { contains: q, mode: "insensitive" as const } },
          { category: { contains: q, mode: "insensitive" as const } },
          { maker: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [parts, total] = await Promise.all([
    prisma.ecompPart.findMany({ where, orderBy: { no: "asc" }, skip, take: PAGE_SIZE }),
    prisma.ecompPart.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="Ecomp Parts"
        description={`${total} record${total === 1 ? "" : "s"} total`}
        actions={
          editable && <LinkButton href="/ecomp-parts/new">+ New record</LinkButton>
        }
      />

      <FlashBanner message={flash} />

      <Form action="" className="mb-4 flex gap-2">
        <SearchInput defaultValue={q} placeholder="Search ICS, part number, category, maker..." />
      </Form>

      {parts.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={q ? "No matching records" : "No ecomp parts yet"}
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
                  <th className={t.th}>No.</th>
                  <th className={t.th}>Part Number</th>
                  <th className={t.th}>Category</th>
                  <th className={t.th}>ICS</th>
                  <th className={t.th}>Maker</th>
                  <th className={t.thNum}>Inventory Qty</th>
                  <th className={t.th}>Inventory As Of</th>
                  {editable && <th className={t.th} />}
                </tr>
              </thead>
              <tbody className={t.tbody}>
                {parts.map((p) => (
                  <tr key={p.id} className={t.tr}>
                    <td className={t.td}>{p.no ?? <span className="text-slate-300">—</span>}</td>
                    <td className={`${t.td} font-medium text-slate-900`}>
                      <Link href={`/ecomp-parts/${p.id}`} className="hover:text-indigo-600">
                        {p.partNumber ?? <span className="text-slate-300">—</span>}
                      </Link>
                    </td>
                    <td className={t.td}>{p.category ?? <span className="text-slate-300">—</span>}</td>
                    <td className={t.td}>{p.ics}</td>
                    <td className={t.td}>{p.maker ?? <span className="text-slate-300">—</span>}</td>
                    <td className={t.tdNum}>{p.inventoryQty ?? <span className="text-slate-300">—</span>}</td>
                    <td className={t.td}>
                      {p.inventoryAsOf?.toISOString().slice(0, 10) ?? (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    {editable && (
                      <td className={t.tdActions}>
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/ecomp-parts/${p.id}/edit`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-indigo-600"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Link>
                          <DeleteButton action={deleteEcompPart.bind(null, p.id)} />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            basePath="/ecomp-parts"
            searchParams={{ q }}
            skip={skip}
            count={parts.length}
            total={total}
          />
        </>
      )}
    </div>
  );
}
