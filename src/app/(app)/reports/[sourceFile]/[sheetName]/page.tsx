import Link from "next/link";
import { ArrowLeft, Inbox } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import * as t from "@/components/ui/table";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deriveColumns(rows: { data: Prisma.JsonValue }[]): string[] {
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of rows.slice(0, 20)) {
    if (!isPlainObject(row.data)) continue;
    for (const key of Object.keys(row.data)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }
  return columns;
}

function cellValue(data: Prisma.JsonValue, column: string): string {
  if (!isPlainObject(data)) return "";
  const value = data[column];
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default async function ComputedSheetPage({
  params,
}: {
  params: Promise<{ sourceFile: string; sheetName: string }>;
}) {
  const { sourceFile, sheetName } = await params;

  const rows = await prisma.computedSheetSnapshot.findMany({
    where: { sourceFile, sheetName },
    orderBy: { rowIndex: "asc" },
    take: 500,
  });

  const columns = deriveColumns(rows);
  const csvHref = `/api/reports/${encodeURIComponent(sourceFile)}/${encodeURIComponent(sheetName)}/csv`;

  return (
    <div>
      <Link
        href="/reports"
        className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to reports
      </Link>
      <PageHeader
        title={sheetName}
        description={`${sourceFile} · ${rows.length} row(s) shown${rows.length === 500 ? " (max 500)" : ""}`}
        actions={
          <LinkButton href={csvHref} variant="secondary">
            Export CSV
          </LinkButton>
        }
      />

      {rows.length === 0 ? (
        <EmptyState icon={Inbox} title="No rows found for this sheet." />
      ) : (
        <div className={t.tableWrap}>
          <table className={t.table}>
            <thead className={t.thead}>
              <tr>
                <th className={t.thNum}>Row</th>
                {columns.map((col) => (
                  <th key={col} className={t.th}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={t.tbody}>
              {rows.map((row) => (
                <tr key={row.id} className={t.tr}>
                  <td className={t.tdNum}>{row.rowIndex}</td>
                  {columns.map((col) => (
                    <td key={col} className={t.td}>
                      {cellValue(row.data, col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
