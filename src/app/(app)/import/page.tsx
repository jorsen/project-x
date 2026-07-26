import { prisma } from "@/lib/prisma";
import { ImportForm } from "./ImportForm";

export const maxDuration = 60;

export default async function ImportPage() {
  const recentRuns = await prisma.importRun.findMany({
    orderBy: { importedAt: "desc" },
    take: 10,
  });

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold text-gray-900">Import Excel</h1>
      <p className="mb-4 text-sm text-gray-600">
        Upload either source workbook to load or refresh its data. Existing records are matched
        by their natural key (ICS, part code, PO number, etc.) and updated in place — records you
        added manually through the site are never deleted by an import.
      </p>

      <ImportForm />

      <h2 className="mt-8 mb-2 text-sm font-semibold text-gray-900">Recent imports</h2>
      {recentRuns.length === 0 ? (
        <p className="text-sm text-gray-500">No imports yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 text-sm">
          {recentRuns.map((run) => (
            <li key={run.id} className="px-3 py-2">
              <span className="font-medium text-gray-800">{run.fileName}</span>{" "}
              <span className="text-gray-500">
                ({run.sourceFile}) — {run.importedAt.toISOString().slice(0, 19).replace("T", " ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
