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

/** Returns the last column in the header row that has a real (non-blank,
 * non-zero) label, scanning backward from the worksheet's raw column count.
 * Several computed sheets have a run of genuinely unused trailing columns
 * past their real table — blank headers, sometimes with leftover 0/#N/A
 * formula noise in the data rows — that would otherwise show up as ugly
 * "colN" columns. Only safe for sheets where the *tail* is unused: a sheet
 * that has real data hiding under a blank-headered column (checked by hand
 * per sheet, e.g. Forecast_CALQ) must not use this and should keep its raw
 * column count instead. */
export function trimTrailingBlankColumns(worksheet: ExcelJS.Worksheet, headerRow: number): number {
  const row = worksheet.getRow(headerRow);
  for (let col = worksheet.columnCount; col >= 1; col--) {
    const value = cellValue(row.getCell(col));
    const isBlankLike =
      value === null || value === undefined || value === "" || value === 0;
    if (!isBlankLike) return col;
  }
  return worksheet.columnCount;
}

/** Finds the first row at or after `fromRow` where every cell up to `maxCol`
 * is blank. Some sheets (e.g. RUNNING STOCK (Resin)) have a free-text
 * "Legend"/"Remarks" block below their real table, separated by a blank row
 * — without a bound, that footer text gets swept in as if it were data rows
 * (its identifier-shaped column holds real text, so the generic per-row
 * blank/identifier check in computed.ts can't tell it apart on its own).
 * Returns null if no blank row is found before the worksheet's last row. */
export function findFirstBlankRow(
  worksheet: ExcelJS.Worksheet,
  fromRow: number,
  maxCol: number,
): number | null {
  for (let r = fromRow; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    let hasValue = false;
    for (let col = 1; col <= maxCol; col++) {
      const value = cellValue(row.getCell(col));
      if (value !== null && value !== undefined && value !== "") {
        hasValue = true;
        break;
      }
    }
    if (!hasValue) return r;
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

/** Generic bulk-upsert for a table keyed by a natural key: one bulk
 * createMany() for rows that don't exist yet (a single round-trip no matter
 * how many rows), concurrent individual update() calls only for the ones
 * that do. Doing a network round-trip per row was what pushed imports past
 * Vercel's function timeout with hundreds/thousands of rows per sheet. */
export async function bulkUpsertChildren<TJob, TWhere>(opts: {
  jobs: TJob[];
  keyOf: (job: TJob) => string;
  existingKeys: Set<string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- bridges
  // to whichever Prisma model's own strictly-typed createMany/update
  // methods the caller passes in; a shared generic helper can't unify
  // those per-model input types without excessive per-call-site generics.
  createData: (job: TJob) => any;
  updateWhere: (job: TJob) => TWhere;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateData: (job: TJob) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createMany: (data: any[]) => Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (args: { where: TWhere; data: any }) => Promise<unknown>;
}): Promise<ImportCounts> {
  const counts = emptyCounts();
  if (opts.jobs.length === 0) return counts;

  const toCreate = opts.jobs.filter((j) => !opts.existingKeys.has(opts.keyOf(j)));
  const toUpdate = opts.jobs.filter((j) => opts.existingKeys.has(opts.keyOf(j)));

  if (toCreate.length > 0) {
    await opts.createMany(toCreate.map(opts.createData));
    counts.created += toCreate.length;
  }

  await Promise.all(
    toUpdate.map(async (j) => {
      await opts.update({ where: opts.updateWhere(j), data: opts.updateData(j) });
      counts.updated++;
    }),
  );

  return counts;
}

export interface ImportSummary {
  sourceFile: string;
  fileName: string;
  entities: Record<string, ImportCounts>;
  computedSheets: Record<string, number>;
}
