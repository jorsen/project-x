import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Inbox, Table2, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { RowSelect } from "@/components/ui/RowSelect";
import * as t from "@/components/ui/table";
import {
  isDateColumn,
  monthKeyOf,
  shiftMonth,
  monthLabel,
  buildMonthGrid,
  rowLabel,
} from "@/lib/calendar";

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

function numericCellValue(data: Prisma.JsonValue, column: string): number | null {
  if (!isPlainObject(data)) return null;
  const value = data[column];
  return typeof value === "number" ? value : null;
}

function rowMatches(data: Prisma.JsonValue, query: string): boolean {
  if (!isPlainObject(data)) return false;
  return Object.values(data).some((value) => {
    if (value === null || value === undefined) return false;
    const str = typeof value === "object" ? JSON.stringify(value) : String(value);
    return str.toLowerCase().includes(query);
  });
}

function withParams(
  base: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  const merged = { ...base, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export default async function ComputedSheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ sourceFile: string; sheetName: string }>;
  searchParams: Promise<{ q?: string; view?: string; row?: string; month?: string }>;
}) {
  const { sourceFile, sheetName } = await params;
  const { q, view: viewParam, row: rowParam, month: monthParam } = await searchParams;

  const allRows = await prisma.computedSheetSnapshot.findMany({
    where: { sourceFile, sheetName },
    orderBy: { rowIndex: "asc" },
    take: 500,
  });

  const query = q?.trim().toLowerCase();
  const rows = query ? allRows.filter((row) => rowMatches(row.data, query)) : allRows;

  const columns = deriveColumns(allRows);
  const dateColumns = columns.filter(isDateColumn).sort();
  const hasCalendar = dateColumns.length > 0;
  const view = viewParam === "calendar" && hasCalendar ? "calendar" : "table";

  const csvHref = `/api/reports/${encodeURIComponent(sourceFile)}/${encodeURIComponent(sheetName)}/csv`;
  const baseParams = { q, row: rowParam, month: monthParam };

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
        description={`${sourceFile} · ${rows.length} of ${allRows.length} row(s) shown${allRows.length === 500 ? " (max 500)" : ""}`}
        actions={
          <div className="flex gap-2">
            {hasCalendar && (
              <LinkButton
                href={withParams(baseParams, { view: view === "table" ? "calendar" : "table" })}
                variant="secondary"
              >
                {view === "table" ? (
                  <>
                    <CalendarDays className="h-4 w-4" /> Calendar view
                  </>
                ) : (
                  <>
                    <Table2 className="h-4 w-4" /> Table view
                  </>
                )}
              </LinkButton>
            )}
            <LinkButton href={csvHref} variant="secondary">
              Export CSV
            </LinkButton>
          </div>
        }
      />

      <div className="mb-4 flex gap-2">
        <SearchInput placeholder="Search this report..." />
      </div>

      {allRows.length === 0 ? (
        <EmptyState icon={Inbox} title="No rows found for this sheet." />
      ) : rows.length === 0 ? (
        <EmptyState icon={Inbox} title="No rows match your search." />
      ) : view === "calendar" ? (
        <CalendarView
          rows={rows}
          columns={columns}
          dateColumns={dateColumns}
          rowParam={rowParam}
          monthParam={monthParam}
          baseParams={{ ...baseParams, view: "calendar" }}
        />
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

function CalendarView({
  rows,
  columns,
  dateColumns,
  rowParam,
  monthParam,
  baseParams,
}: {
  rows: { id: string; rowIndex: number; data: Prisma.JsonValue }[];
  columns: string[];
  dateColumns: string[];
  rowParam: string | undefined;
  monthParam: string | undefined;
  baseParams: Record<string, string | undefined>;
}) {
  const options = rows.map((r) => ({
    value: r.id,
    label: rowLabel(isPlainObject(r.data) ? r.data : {}, columns, r.rowIndex),
  }));

  const selectedRow = rows.find((r) => r.id === rowParam) ?? rows[0];
  const monthKey =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : monthKeyOf(dateColumns[0]);

  const weeks = buildMonthGrid(monthKey);

  // Sum this row's values per month, across every date column present —
  // the "by months" rollup alongside the day-by-day grid.
  const monthTotals = new Map<string, number>();
  for (const col of dateColumns) {
    const value = numericCellValue(selectedRow.data, col);
    if (value === null) continue;
    const key = monthKeyOf(col);
    monthTotals.set(key, (monthTotals.get(key) ?? 0) + value);
  }
  const sortedMonths = [...monthTotals.keys()].sort();
  const maxMonthTotal = Math.max(1, ...monthTotals.values());

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Part</label>
        <RowSelect options={options} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={withParams(baseParams, {
              row: selectedRow.id,
              month: shiftMonth(monthKey, -1),
            })}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Link>
          <h3 className="text-sm font-semibold text-slate-900">{monthLabel(monthKey)}</h3>
          <Link
            href={withParams(baseParams, {
              row: selectedRow.id,
              month: shiftMonth(monthKey, 1),
            })}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold tracking-wide text-slate-400 uppercase">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((cell, i) => {
            if (!cell.date) {
              return <div key={i} className="aspect-square rounded-md bg-slate-50" />;
            }
            const value = dateColumns.includes(cell.date)
              ? numericCellValue(selectedRow.data, cell.date)
              : null;
            const day = Number(cell.date.slice(8, 10));
            return (
              <div
                key={i}
                className="flex aspect-square flex-col items-center justify-center rounded-md border border-slate-100 bg-white"
              >
                <span className="text-[11px] text-slate-400">{day}</span>
                <span
                  className={`text-sm font-medium tabular-nums ${
                    value ? "text-slate-900" : "text-slate-300"
                  }`}
                >
                  {value ?? "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {sortedMonths.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">By Month</h3>
          <div className="space-y-2">
            {sortedMonths.map((m) => {
              const total = monthTotals.get(m)!;
              return (
                <Link
                  key={m}
                  href={withParams(baseParams, { row: selectedRow.id, month: m })}
                  className="flex items-center gap-3 rounded-md px-1 py-1 hover:bg-slate-50"
                >
                  <span className="w-28 shrink-0 text-xs font-medium text-slate-600">
                    {monthLabel(m)}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${(total / maxMonthTotal) * 100}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700">
                    {total}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
