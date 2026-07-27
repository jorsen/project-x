import type ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { cellValue } from "./utils";

function jsonSafe(value: unknown): unknown {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  return value;
}

// Some sheets embed subtotal/grand-total rows (e.g. tblDelivery_Quantity has
// "SubTotal1/2/3" and "GTL" rows mixed into the data range, with the label
// stuffed into an unrelated column like "Incoming A") — these have real
// numbers but no identity, and would otherwise show up as phantom "parts".
// When a sheet has at least one identifier-shaped column, a row needs a
// value in one of them to count as real data; sheets with none of these
// columns keep the original any-non-blank-cell behavior unchanged.
const IDENTIFIER_LABELS = new Set([
  "CODE",
  "ICS1",
  "ICS",
  "ITEM NUMBER",
  "PART NAME",
  "PART NUMBER",
  "ITEM NAME",
  "MATERIAL NAME",
]);

/**
 * Generic importer for sheets that are entirely formula-derived output
 * (no raw/editable columns at all). Dumps every non-blank row into
 * ComputedSheetSnapshot as a JSON object keyed by the header row's labels,
 * for read-only display in the Reports section.
 *
 * Existing snapshot rows for this (sourceFile, sheetName) are replaced wholesale
 * on each import since nothing here is user-editable.
 */
export async function importComputedSheet(opts: {
  sourceFile: "ECOMP" | "JSCPH";
  sheetName: string;
  worksheet: ExcelJS.Worksheet;
  headerRow: number;
  dataStartRow: number;
  maxCol: number;
  // Bounds the data block for sheets with trailing free-text content (see
  // findFirstBlankRow) — defaults to the worksheet's own row count.
  lastRow?: number;
}): Promise<number> {
  const { sourceFile, sheetName, worksheet, headerRow, dataStartRow, maxCol, lastRow: lastRowOverride } = opts;

  const headerCells = worksheet.getRow(headerRow);
  const labels: string[] = [];
  const usedLabels = new Set<string>();
  for (let col = 1; col <= maxCol; col++) {
    const raw = cellValue(headerCells.getCell(col));
    const isValidDate = raw instanceof Date && !Number.isNaN(raw.getTime());
    let label = isValidDate
      ? (raw as Date).toISOString().slice(0, 10)
      : raw && !(raw instanceof Date)
        ? String(raw).trim()
        : "";
    if (!label) label = `col${col}`;
    // Header labels become JSON object keys — de-duplicate so two columns
    // with the same label (or two blank ones) don't silently overwrite
    // each other's values in a row.
    if (usedLabels.has(label)) label = `${label} (${col})`;
    usedLabels.add(label);
    labels[col] = label;
  }

  const identifierLabels = [...usedLabels].filter((label) =>
    IDENTIFIER_LABELS.has(label.trim().toUpperCase()),
  );

  const rows: { rowIndex: number; data: Record<string, unknown> }[] = [];
  const lastRow = lastRowOverride ?? Math.max(worksheet.rowCount, dataStartRow);

  for (let rowNum = dataStartRow; rowNum <= lastRow; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const data: Record<string, unknown> = {};
    let hasValue = false;

    for (let col = 1; col <= maxCol; col++) {
      const value = jsonSafe(cellValue(row.getCell(col)));
      if (value !== null && value !== undefined && value !== "") hasValue = true;
      data[labels[col]] = value;
    }

    const hasIdentifier =
      identifierLabels.length === 0 ||
      identifierLabels.some((label) => {
        const v = data[label];
        return v !== null && v !== undefined && v !== "";
      });

    if (hasValue && hasIdentifier) {
      rows.push({ rowIndex: rowNum, data });
    }
  }

  // Blank cells default to 0 in columns that otherwise hold numbers (so a
  // report like tblDelivery_Quantity shows 0 instead of a blank cell for a
  // day with no delivery) — text columns (part names, etc.) are left alone.
  const numericLabels = new Set<string>();
  for (let col = 1; col <= maxCol; col++) {
    const label = labels[col];
    if (!label || numericLabels.has(label)) continue;
    if (rows.some((r) => typeof r.data[label] === "number")) {
      numericLabels.add(label);
    }
  }
  for (const row of rows) {
    for (const label of numericLabels) {
      if (row.data[label] === null || row.data[label] === undefined) {
        row.data[label] = 0;
      }
    }
  }

  // Placeholder-labeled ("colN") columns that never hold a real value in any
  // row are pure spacer columns baked into the sheet — reserved PO slots,
  // leftover scratch cells — and showing them as "COL20", "COL21", etc. in
  // the Reports table is noise, not data. A blank-labeled column that DOES
  // carry real values somewhere (e.g. Forecast_CALQ's column 52) is left
  // alone — only ones with zero data anywhere get dropped.
  const emptyPlaceholderLabels = [...usedLabels].filter((label) => {
    if (!/^col\d+$/.test(label)) return false;
    return !rows.some((r) => r.data[label] !== null && r.data[label] !== undefined && r.data[label] !== "");
  });
  for (const row of rows) {
    for (const label of emptyPlaceholderLabels) {
      delete row.data[label];
    }
  }

  await prisma.computedSheetSnapshot.deleteMany({ where: { sourceFile, sheetName } });
  if (rows.length > 0) {
    await prisma.computedSheetSnapshot.createMany({
      data: rows.map((r) => ({
        sourceFile,
        sheetName,
        rowIndex: r.rowIndex,
        data: r.data as never,
      })),
    });
  }

  return rows.length;
}
