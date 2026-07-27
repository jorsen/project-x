import ExcelJS from "exceljs";

export async function readWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook;
}

/** Normalizes an ExcelJS cell value into a plain primitive, resolving
 * formula-result objects and rich text so callers never see ExcelJS internals. */
export function cellValue(cell: ExcelJS.Cell | undefined): unknown {
  if (!cell) return null;
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) return (v as { result: unknown }).result ?? null;
    if ("richText" in v) {
      return (v as { richText: Array<{ text: string }> }).richText.map((r) => r.text).join("");
    }
    if ("text" in v) return (v as { text: string }).text;
    return null;
  }
  return v;
}

export function toStr(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str || null;
}

export function toNum(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

export function toDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Finds a header cell matching `label` (case-insensitive) and returns its
 * column index. Some sheets have extra scratch/helper columns past the real
 * table (with their own header text, so they don't fall back to a blank
 * "colN" label and get silently trimmed) — this lets an importer stop the
 * computed-report snapshot at the last column that's actually part of the
 * table, by name, instead of trusting the worksheet's raw column count. */
export function findHeaderColumn(
  worksheet: ExcelJS.Worksheet,
  headerRow: number,
  label: string,
): number | null {
  const row = worksheet.getRow(headerRow);
  const target = label.trim().toLowerCase();
  for (let col = 1; col <= worksheet.columnCount; col++) {
    const value = cellValue(row.getCell(col));
    if (typeof value === "string" && value.trim().toLowerCase() === target) {
      return col;
    }
  }
  return null;
}

/** Strips null/undefined keys so a Prisma `update` only touches fields that
 * actually have a new value, letting repeated imports from different sheets
 * progressively enrich a shared record without clobbering existing data. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    const value = obj[key];
    if (value !== null && value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

export interface ImportCounts {
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
}

export function emptyCounts(): ImportCounts {
  return { created: 0, updated: 0, unchanged: 0, skipped: 0 };
}

export interface ImportSummary {
  sourceFile: string;
  fileName: string;
  entities: Record<string, ImportCounts>;
  computedSheets: Record<string, number>;
}
