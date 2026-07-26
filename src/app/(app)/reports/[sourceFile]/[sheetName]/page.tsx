import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

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
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {sourceFile}
          </p>
          <h1 className="text-xl font-semibold text-gray-900">{sheetName}</h1>
          <p className="text-sm text-gray-500">
            {rows.length} row(s) shown{rows.length === 500 ? " (max 500)" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/reports"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Back to reports
          </Link>
          <a
            href={csvHref}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Export CSV
          </a>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          No rows found for this sheet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Row</th>
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2 text-left font-medium text-gray-500">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 text-gray-500">{row.rowIndex}</td>
                  {columns.map((col) => (
                    <td key={col} className="px-3 py-2">
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
