import type ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { cellValue } from "./utils";

function jsonSafe(value: unknown): unknown {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  return value;
}

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
}): Promise<number> {
  const { sourceFile, sheetName, worksheet, headerRow, dataStartRow, maxCol } = opts;

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

  const rows: { rowIndex: number; data: Record<string, unknown> }[] = [];
  const lastRow = Math.max(worksheet.rowCount, dataStartRow);

  for (let rowNum = dataStartRow; rowNum <= lastRow; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const data: Record<string, unknown> = {};
    let hasValue = false;

    for (let col = 1; col <= maxCol; col++) {
      const value = jsonSafe(cellValue(row.getCell(col)));
      if (value !== null && value !== undefined && value !== "") hasValue = true;
      data[labels[col]] = value;
    }

    if (hasValue) {
      rows.push({ rowIndex: rowNum, data });
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
