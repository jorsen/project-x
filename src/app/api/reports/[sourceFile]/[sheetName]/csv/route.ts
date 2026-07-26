import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deriveColumns(rows: { data: Prisma.JsonValue }[]): string[] {
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
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

function escapeCsvValue(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsvRow(values: string[]): string {
  return values.map(escapeCsvValue).join(",");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sourceFile: string; sheetName: string }> },
) {
  const { sourceFile, sheetName } = await params;

  const rows = await prisma.computedSheetSnapshot.findMany({
    where: { sourceFile, sheetName },
    orderBy: { rowIndex: "asc" },
  });

  const columns = deriveColumns(rows);
  const lines: string[] = [];
  lines.push(toCsvRow(["rowIndex", ...columns]));
  for (const row of rows) {
    lines.push(
      toCsvRow([String(row.rowIndex), ...columns.map((col) => cellValue(row.data, col))]),
    );
  }
  const csv = lines.join("\r\n") + "\r\n";

  const safeSheetName = sheetName.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const safeSourceFile = sourceFile.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const filename = `${safeSourceFile}_${safeSheetName}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
