import Link from "next/link";
import Form from "next/form";
import { ClipboardList, Pencil } from "lucide-react";
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
import { SourceSheetBadge } from "@/components/ui/Badge";
import * as t from "@/components/ui/table";
import { deleteOpenPoLine } from "./actions";

const TABS = [
  { label: "All", value: undefined },
  { label: "Supplier", value: "SUPPLIER" },
  { label: "Amount", value: "AMOUNT" },
] as const;

function tabHref(q: string | undefined, source: string | undefined) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (source) params.set("source", source);
  const qs = params.toString();
  return qs ? `/open-po?${qs}` : "/open-po";
}

export default async function OpenPoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string; skip?: string; flash?: string }>;
}) {
  const { q, source, skip: skipParam, flash } = await searchParams;
  const skip = parseSkip(skipParam);
  const session = await auth();
  const editable = canEdit(session?.user?.role);

  const sourceSheet = source === "SUPPLIER" || source === "AMOUNT" ? source : undefined;

  const where = {
    ...(sourceSheet ? { sourceSheet } : {}),
    ...(q
      ? {
          OR: [
            { ics: { contains: q, mode: "insensitive" as const } },
            { partNumber: { contains: q, mode: "insensitive" as const } },
            { category: { contains: q, mode: "insensitive" as const } },
            { maker: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [records, total] = await Promise.all([
    prisma.openPoLine.findMany({
      where,
      orderBy: [{ ics: "asc" }, { sourceSheet: "asc" }],
      skip,
      take: PAGE_SIZE,
    }),
    prisma.openPoLine.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="Open PO Lines"
        description={`${total} record${total === 1 ? "" : "s"} total`}
        actions={editable && <LinkButton href="/open-po/new">+ New record</LinkButton>}
      />

      <FlashBanner message={flash} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const active = sourceSheet === tab.value;
            return (
              <Link
                key={tab.label}
                href={tabHref(q, tab.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <Form action="" className="flex gap-2">
          {sourceSheet && <input type="hidden" name="source" value={sourceSheet} />}
          <SearchInput defaultValue={q} placeholder="Search ICS, part number, category, maker..." />
        </Form>
      </div>

      {records.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={q || sourceSheet ? "No matching records" : "No open PO lines yet"}
          description={
            q || sourceSheet
              ? "Try a different search term or filter."
              : "Add one manually, or import the source workbook."
          }
        />
      ) : (
        <>
          <div className={t.tableWrap}>
            <table className={t.table}>
              <thead className={t.thead}>
                <tr>
                  <th className={t.th}>Source Sheet</th>
                  <th className={t.th}>No.</th>
                  <th className={t.th}>Part Number</th>
                  <th className={t.th}>Category</th>
                  <th className={t.th}>ICS</th>
                  <th className={t.th}>Maker</th>
                  <th className={t.thNum}>Unit Price</th>
                  <th className={t.th} />
                </tr>
              </thead>
              <tbody className={t.tbody}>
                {records.map((r) => (
                  <tr key={r.id} className={t.tr}>
                    <td className={t.td}>
                      <SourceSheetBadge sourceSheet={r.sourceSheet} />
                    </td>
                    <td className={t.td}>{r.no ?? <span className="text-slate-300">—</span>}</td>
                    <td className={`${t.td} font-medium text-slate-900`}>
                      {r.partNumber ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className={t.td}>{r.category ?? <span className="text-slate-300">—</span>}</td>
                    <td className={t.td}>{r.ics}</td>
                    <td className={t.td}>{r.maker ?? <span className="text-slate-300">—</span>}</td>
                    <td className={t.tdNum}>{r.unitPrice ?? <span className="text-slate-300">—</span>}</td>
                    <td className={t.tdActions}>
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/open-po/${r.id}`}
                          className="text-xs font-medium text-slate-600 hover:text-indigo-600"
                        >
                          View
                        </Link>
                        {editable && (
                          <>
                            <Link
                              href={`/open-po/${r.id}/edit`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-indigo-600"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </Link>
                            <DeleteButton action={deleteOpenPoLine.bind(null, r.id)} />
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
            basePath="/open-po"
            searchParams={{ q, source }}
            skip={skip}
            count={records.length}
            total={total}
          />
        </>
      )}
    </div>
  );
}
