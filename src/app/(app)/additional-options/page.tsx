import Link from "next/link";
import { Pencil, PackagePlus } from "lucide-react";
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
import { deleteProduct } from "./actions";

export default async function AdditionalOptionsPage({
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
          { materialName: { contains: q, mode: "insensitive" as const } },
          { partNumber: { contains: q, mode: "insensitive" as const } },
          { category: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { no: "asc" }, skip, take: PAGE_SIZE }),
    prisma.product.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="Additional Options"
        description={`${total} product${total === 1 ? "" : "s"} total`}
        actions={editable && <LinkButton href="/additional-options/new">+ New product</LinkButton>}
      />

      <FlashBanner message={flash} />

      <div className="mb-4 flex gap-2">
        <SearchInput placeholder="Search ICS, material name, part number, category..." />
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={PackagePlus}
          title={q ? "No matching products" : "No products yet"}
          description={q ? "Try a different search term." : "Add one to get started."}
        />
      ) : (
        <>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead className={t.thead}>
                <tr>
                  <th className={t.thNum}>No.</th>
                  <th className={t.th}>ICS</th>
                  <th className={t.th}>Material Name</th>
                  <th className={t.th}>Part Number</th>
                  <th className={t.th}>Category</th>
                  <th className={t.thNum}>SPQ</th>
                  <th className={t.thNum}>Unit Price</th>
                  <th className={t.thNum}>Old Unit Price</th>
                  {editable && <th className={t.th} />}
                </tr>
              </thead>
              <tbody className={t.tbody}>
                {products.map((p) => (
                  <tr key={p.id} className={t.tr}>
                    <td className={t.tdNum}>{p.no}</td>
                    <td className={`${t.td} font-medium text-slate-900`}>
                      {p.ics ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className={t.td}>
                      {p.materialName ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className={t.td}>
                      {p.partNumber ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className={t.td}>
                      {p.category ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className={t.tdNum}>{p.spq ?? <span className="text-slate-300">—</span>}</td>
                    <td className={t.tdNum}>
                      {p.unitPrice ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className={t.tdNum}>
                      {p.oldUnitPrice ?? <span className="text-slate-300">—</span>}
                    </td>
                    {editable && (
                      <td className={t.tdActions}>
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/additional-options/${p.id}/edit`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-indigo-600"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Link>
                          <DeleteButton action={deleteProduct.bind(null, p.id)} />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            basePath="/additional-options"
            searchParams={{ q }}
            skip={skip}
            count={products.length}
            total={total}
          />
        </>
      )}
    </div>
  );
}
