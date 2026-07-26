import Link from "next/link";
import { Layers } from "lucide-react";
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
import { deleteJscphPart } from "./actions";

export default async function JscphPartsPage({
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
          { code: { contains: q, mode: "insensitive" as const } },
          { ics1: { contains: q, mode: "insensitive" as const } },
          { partName: { contains: q, mode: "insensitive" as const } },
          { modelName: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [parts, total] = await Promise.all([
    prisma.jscphPart.findMany({ where, orderBy: { code: "asc" }, skip, take: PAGE_SIZE }),
    prisma.jscphPart.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="JSCPH Parts"
        description={`${total} record${total === 1 ? "" : "s"} total`}
        actions={
          editable && <LinkButton href="/jscph-parts/new">+ New record</LinkButton>
        }
      />

      <FlashBanner message={flash} />

      <form className="mb-4 flex gap-2">
        <SearchInput defaultValue={q} placeholder="Search code, ICS1, part name, model name..." />
      </form>

      {parts.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={q ? "No matching records" : "No JSCPH parts yet"}
          description={q ? "Try a different search term." : "Add one manually to get started."}
        />
      ) : (
        <>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead className={t.thead}>
                <tr>
                  <th className={t.th}>Code</th>
                  <th className={t.th}>ICS1</th>
                  <th className={t.th}>Part Name</th>
                  <th className={t.th}>Model Name</th>
                  <th className={t.thNum}>SPQ</th>
                  <th className={t.thNum}>Unit Price Purchase</th>
                  <th className={t.thNum}>Unit Price Sales</th>
                  <th className={t.th} />
                </tr>
              </thead>
              <tbody className={t.tbody}>
                {parts.map((p) => (
                  <tr key={p.id} className={t.tr}>
                    <td className={`${t.td} font-medium text-slate-900`}>{p.code}</td>
                    <td className={t.td}>{p.ics1 ?? <span className="text-slate-300">—</span>}</td>
                    <td className={t.td}>{p.partName ?? <span className="text-slate-300">—</span>}</td>
                    <td className={t.td}>{p.modelName ?? <span className="text-slate-300">—</span>}</td>
                    <td className={t.tdNum}>{p.spq ?? <span className="text-slate-300">—</span>}</td>
                    <td className={t.tdNum}>
                      {p.unitPricePurchase ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className={t.tdNum}>
                      {p.unitPriceSales ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className={t.tdActions}>
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/jscph-parts/${p.id}`}
                          className="text-xs font-medium text-slate-600 hover:text-indigo-600"
                        >
                          View
                        </Link>
                        {editable && (
                          <>
                            <Link
                              href={`/jscph-parts/${p.id}/edit`}
                              className="text-xs font-medium text-slate-600 hover:text-indigo-600"
                            >
                              Edit
                            </Link>
                            <DeleteButton action={deleteJscphPart.bind(null, p.id)} />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            basePath="/jscph-parts"
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
