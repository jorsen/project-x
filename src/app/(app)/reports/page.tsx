import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  const groups = await prisma.computedSheetSnapshot.groupBy({
    by: ["sourceFile", "sheetName"],
    _count: true,
    orderBy: [{ sourceFile: "asc" }, { sheetName: "asc" }],
  });

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Computed Reports</h1>
        <p className="text-sm text-gray-500">
          Read-only, formula-derived rows imported from Excel. Select a sheet to view its rows.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          No computed reports imported yet — use the Import page to load an Excel file.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Link
              key={`${g.sourceFile}::${g.sheetName}`}
              href={`/reports/${encodeURIComponent(g.sourceFile)}/${encodeURIComponent(g.sheetName)}`}
              className="rounded-md border border-gray-200 bg-white p-4 hover:border-gray-400 hover:shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {g.sourceFile}
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">{g.sheetName}</p>
              <p className="mt-2 text-xs text-gray-500">{g._count} row(s)</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
