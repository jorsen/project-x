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

const CODE_COLUMN = "CODE";
const PART_NAME_CANDIDATES = ["PART NAME", "ITEM NAME"];

/** Renders a table cell, turning the Part Name column into a link to that
 * row's calendar/detail drill-down when one exists — used by both the flat
 * table view and CategoryView so every report table gets this consistently,
 * not just category-enabled ones. */
function renderRowCell(
  row: { id: string; data: Prisma.JsonValue },
  col: string,
  opts: { partNameColumn: string | undefined; linkable: boolean; baseParams: Record<string, string | undefined> },
) {
  if (col !== opts.partNameColumn || !opts.linkable) {
    return (
      <td key={col} className={t.td}>
        {cellValue(row.data, col)}
      </td>
    );
  }
  return (
    <td key={col} className={`${t.td} p-0`}>
      <Link
        href={withParams(opts.baseParams, { view: "calendar", row: row.id })}
        className="block px-4 py-2.5 font-medium text-indigo-600 hover:underline"
        title="View this part's detail"
      >
        {cellValue(row.data, col)}
      </Link>
    </td>
  );
}

// --- Forecast_CALQ is a bespoke case: it has a CODE column like
// tblDelivery_Quantity but no daily date columns — its "detail" data is 7
// months of Usage/Buffer/Order, Incoming Quantities, Monthly BOH, and Sales
// Performance instead. The source sheet repeats identical sub-headers
// (USAGE/BUFFER/ORDER, JUL END..JAN END) for every month/section, so the
// computed-report importer's column-label de-duplication appends the
// column number to every repeat after the first — these keys are exact
// column-position lookups into that fixed, known layout (headerRow 3),
// not derived generically, and would need updating if the sheet's month
// range or column layout ever changes.
const FORECAST_IDENTITY_COLUMNS = ["CODE", "ICS1", "PART NAME", "Model Name", "SPQ"];
const FORECAST_MONTH_LABELS = [
  "Jul '26",
  "Aug '26",
  "Sep '26",
  "Oct '26",
  "Nov '26",
  "Dec '26",
  "Jan '27",
];
const FORECAST_USAGE_KEYS = [
  "USAGE",
  "USAGE (9)",
  "USAGE (12)",
  "USAGE (15)",
  "USAGE (18)",
  "USAGE (21)",
  "USAGE (24)",
];
const FORECAST_BUFFER_KEYS = [
  "BUFFER",
  "BUFFER (10)",
  "BUFFER (13)",
  "BUFFER (16)",
  "BUFFER (19)",
  "BUFFER (22)",
  "BUFFER (25)",
];
const FORECAST_ORDER_KEYS = [
  "ORDER",
  "ORDER (11)",
  "ORDER (14)",
  "ORDER (17)",
  "ORDER (20)",
  "ORDER (23)",
  "ORDER (26)",
];
const FORECAST_INCOMING_KEYS = [
  "Jun '26",
  "Jul '26",
  "Aug '26",
  "Sep '26",
  "Oct '26",
  "Nov '26",
];
const FORECAST_BOH_KEYS = [
  "JUL END",
  "AUG END",
  "SEP END",
  "OCT END",
  "NOV END",
  "DEC END",
  "JAN END",
];
const FORECAST_SALES_KEYS = [
  "JUL END (44)",
  "AUG END (45)",
  "SEP END (46)",
  "OCT END (47)",
  "NOV END (48)",
  "DEC END (49)",
  "JAN END (50)",
];

export default async function ComputedSheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ sourceFile: string; sheetName: string }>;
  searchParams: Promise<{ q?: string; view?: string; row?: string; month?: string; category?: string }>;
}) {
  const { sourceFile: rawSourceFile, sheetName: rawSheetName } = await params;
  // Sheet names with spaces (SEP DS, SEP FCT, STOCK RATIO RESIN, ...) arrive
  // still percent-encoded here rather than auto-decoded, so the raw segment
  // never matched anything in the database — decode explicitly.
  const sourceFile = decodeURIComponent(rawSourceFile);
  const sheetName = decodeURIComponent(rawSheetName);
  const {
    q,
    view: viewParam,
    row: rowParam,
    month: monthParam,
    category: categoryParam,
  } = await searchParams;

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
  const isForecastCalq = sheetName === "Forecast_CALQ";
  // Whether this sheet has *some* per-part drill-down to show after picking
  // a category — either the generic day calendar, or Forecast_CALQ's bespoke
  // monthly detail view.
  const hasDetail = hasCalendar || isForecastCalq;

  // allRows is ordered by rowIndex, so this naturally preserves the sheet's
  // own block order (IP, then R, then EC) rather than sorting alphabetically.
  const categories = columns.includes(CODE_COLUMN)
    ? [...new Set(allRows.map((r) => cellValue(r.data, CODE_COLUMN)).filter(Boolean))]
    : [];
  const hasCategory = hasDetail && categories.length > 0;

  // Category-enabled sheets (CODE + a drill-down) skip Table/Calendar as
  // separate modes entirely — By Category is the whole experience, and the
  // detail view is reached only by clicking a part name from that list, not
  // a top-level tab.
  const view = hasCategory
    ? viewParam === "calendar" && hasDetail
      ? "calendar"
      : "category"
    : viewParam === "calendar" && hasCalendar
      ? "calendar"
      : "table";
  // Once a report has a detail drill-down, the day/month figures live
  // there — the flat table only needs the identity/summary columns to stay
  // readable.
  const tableColumns = isForecastCalq
    ? columns.filter((c) => FORECAST_IDENTITY_COLUMNS.includes(c))
    : hasCalendar
      ? columns.filter((c) => !isDateColumn(c))
      : columns;
  const partNameColumn = tableColumns.find((c) =>
    PART_NAME_CANDIDATES.includes(c.trim().toUpperCase()),
  );

  const csvHref = `/api/reports/${encodeURIComponent(sourceFile)}/${encodeURIComponent(sheetName)}/csv`;
  const baseParams = { q, row: rowParam, month: monthParam, category: categoryParam };

  const viewTabs = hasCategory
    ? []
    : [
        { value: "table", label: "Table", icon: Table2 },
        ...(hasCalendar ? [{ value: "calendar", label: "Calendar", icon: CalendarDays }] : []),
      ];

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
            {viewTabs.length > 1 && (
              <div className="flex overflow-hidden rounded-md border border-slate-300">
                {viewTabs.map((tab, i) => (
                  <Link
                    key={tab.value}
                    href={withParams(baseParams, { view: tab.value })}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium ${
                      i > 0 ? "border-l border-slate-300" : ""
                    } ${
                      view === tab.value
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <tab.icon className="h-4 w-4" /> {tab.label}
                  </Link>
                ))}
              </div>
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
      ) : view === "calendar" && hasCalendar ? (
        <CalendarView
          rows={rows}
          columns={columns}
          dateColumns={dateColumns}
          rowParam={rowParam}
          monthParam={monthParam}
          baseParams={{ ...baseParams, view: "calendar" }}
        />
      ) : view === "calendar" && isForecastCalq ? (
        <ForecastDetailView
          rows={rows}
          columns={columns}
          rowParam={rowParam}
          baseParams={{ ...baseParams, view: "calendar" }}
        />
      ) : view === "category" ? (
        <CategoryView
          rows={rows}
          tableColumns={tableColumns}
          partNameColumn={partNameColumn}
          categories={categories}
          categoryParam={categoryParam}
          baseParams={{ ...baseParams, view: "category" }}
        />
      ) : (
        <div className={t.tableWrap}>
          <table className={t.table}>
            <thead className={t.thead}>
              <tr>
                <th className={t.thNum}>Row</th>
                {tableColumns.map((col) => (
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
                  {tableColumns.map((col) =>
                    renderRowCell(row, col, { partNameColumn, linkable: hasDetail, baseParams }),
                  )}
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
      {baseParams.category && (
        <Link
          href={withParams(baseParams, { view: "category", row: undefined, month: undefined })}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {baseParams.category} parts
        </Link>
      )}

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

function CategoryView({
  rows,
  tableColumns,
  partNameColumn,
  categories,
  categoryParam,
  baseParams,
}: {
  rows: { id: string; rowIndex: number; data: Prisma.JsonValue }[];
  tableColumns: string[];
  partNameColumn: string | undefined;
  categories: string[];
  categoryParam: string | undefined;
  baseParams: Record<string, string | undefined>;
}) {
  const selectedCategory =
    categoryParam && categories.includes(categoryParam) ? categoryParam : undefined;

  // At a glance: just the 3 categories with counts — pick one to see records.
  if (!selectedCategory) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {categories.map((c) => {
          const count = rows.filter((r) => cellValue(r.data, CODE_COLUMN) === c).length;
          return (
            <Link
              key={c}
              href={withParams(baseParams, { category: c })}
              className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
            >
              <p className="text-2xl font-bold text-indigo-600">{c}</p>
              <p className="mt-1 text-sm text-slate-500">
                {count} part{count === 1 ? "" : "s"}
              </p>
            </Link>
          );
        })}
      </div>
    );
  }

  const categoryRows = rows.filter((r) => cellValue(r.data, CODE_COLUMN) === selectedCategory);

  // Subtotal every numeric column shown here (SPQ, BOH, Incoming A/B, Scrap,
  // Forecast, Total Out, Inventory, ...) — text columns (CODE, ICS1, Part
  // Name, Model Name) stay blank in the footer, same as the workbook's own
  // SubTotal rows only fill in numeric columns.
  const numericColumns = tableColumns.filter((col) =>
    categoryRows.some((r) => numericCellValue(r.data, col) !== null),
  );
  const subtotals = new Map<string, number>();
  for (const col of numericColumns) {
    let sum = 0;
    for (const row of categoryRows) {
      sum += numericCellValue(row.data, col) ?? 0;
    }
    subtotals.set(col, sum);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((c) => (
          <Link
            key={c}
            href={withParams(baseParams, { category: c })}
            className={`rounded-md px-3.5 py-2 text-sm font-medium ${
              c === selectedCategory
                ? "bg-indigo-600 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {c}
          </Link>
        ))}
        <Link
          href={withParams(baseParams, { category: undefined })}
          className="ml-auto text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          ← Back to categories
        </Link>
      </div>

      {categoryRows.length === 0 ? (
        <EmptyState icon={Inbox} title={`No rows in category "${selectedCategory}".`} />
      ) : (
        <div className={t.tableWrap}>
          <table className={t.table}>
            <thead className={t.thead}>
              <tr>
                <th className={t.thNum}>Row</th>
                {tableColumns.map((col) => (
                  <th key={col} className={t.th}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={t.tbody}>
              {categoryRows.map((row) => (
                <tr key={row.id} className={t.tr}>
                  <td className={t.tdNum}>{row.rowIndex}</td>
                  {tableColumns.map((col) =>
                    renderRowCell(row, col, { partNameColumn, linkable: true, baseParams }),
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                <td className={t.tdNum}>—</td>
                {tableColumns.map((col) => (
                  <td key={col} className={t.td}>
                    {subtotals.has(col) ? subtotals.get(col) : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function fmt(value: number | null): string {
  return value === null ? "—" : Math.round(value).toLocaleString();
}

function ForecastDetailView({
  rows,
  columns,
  rowParam,
  baseParams,
}: {
  rows: { id: string; rowIndex: number; data: Prisma.JsonValue }[];
  columns: string[];
  rowParam: string | undefined;
  baseParams: Record<string, string | undefined>;
}) {
  const options = rows.map((r) => ({
    value: r.id,
    label: rowLabel(isPlainObject(r.data) ? r.data : {}, columns, r.rowIndex),
  }));
  const selectedRow = rows.find((r) => r.id === rowParam) ?? rows[0];
  const stock = numericCellValue(selectedRow.data, "STOCK");

  return (
    <div className="space-y-6">
      {baseParams.category && (
        <Link
          href={withParams(baseParams, { view: "category", row: undefined })}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {baseParams.category} parts
        </Link>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Part</label>
        <RowSelect options={options} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Monthly Usage / Buffer / Order</h3>
        <div className={t.tableWrap}>
          <table className={t.table}>
            <thead className={t.thead}>
              <tr>
                <th className={t.th}>Month</th>
                <th className={t.thNum}>Usage</th>
                <th className={t.thNum}>Buffer</th>
                <th className={t.thNum}>Order</th>
              </tr>
            </thead>
            <tbody className={t.tbody}>
              {FORECAST_MONTH_LABELS.map((month, i) => (
                <tr key={month} className={t.tr}>
                  <td className={`${t.td} font-medium text-slate-900`}>{month}</td>
                  <td className={t.tdNum}>
                    {fmt(numericCellValue(selectedRow.data, FORECAST_USAGE_KEYS[i]))}
                  </td>
                  <td className={t.tdNum}>
                    {fmt(numericCellValue(selectedRow.data, FORECAST_BUFFER_KEYS[i]))}
                  </td>
                  <td className={t.tdNum}>
                    {fmt(numericCellValue(selectedRow.data, FORECAST_ORDER_KEYS[i]))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Incoming Quantities</h3>
        <div className={t.tableWrap}>
          <table className={t.table}>
            <thead className={t.thead}>
              <tr>
                <th className={t.th}>Stock</th>
                {FORECAST_INCOMING_KEYS.map((k) => (
                  <th key={k} className={t.thNum}>
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={t.tbody}>
              <tr className={t.tr}>
                <td className={`${t.td} font-medium text-slate-900`}>{fmt(stock)}</td>
                {FORECAST_INCOMING_KEYS.map((k) => (
                  <td key={k} className={t.tdNum}>
                    {fmt(numericCellValue(selectedRow.data, k))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Monthly BOH Quantity</h3>
        <div className={t.tableWrap}>
          <table className={t.table}>
            <thead className={t.thead}>
              <tr>
                {FORECAST_BOH_KEYS.map((k) => (
                  <th key={k} className={t.thNum}>
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={t.tbody}>
              <tr className={t.tr}>
                {FORECAST_BOH_KEYS.map((k) => (
                  <td key={k} className={t.tdNum}>
                    {fmt(numericCellValue(selectedRow.data, k))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Sales Performance</h3>
        <div className={t.tableWrap}>
          <table className={t.table}>
            <thead className={t.thead}>
              <tr>
                {FORECAST_BOH_KEYS.map((k) => (
                  <th key={k} className={t.thNum}>
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={t.tbody}>
              <tr className={t.tr}>
                {FORECAST_SALES_KEYS.map((k) => (
                  <td key={k} className={t.tdNum}>
                    {fmt(numericCellValue(selectedRow.data, k))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
