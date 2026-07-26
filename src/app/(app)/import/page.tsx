import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import * as t from "@/components/ui/table";
import { ImportForm } from "./ImportForm";

export const maxDuration = 60;

export default async function ImportPage() {
  const recentRuns = await prisma.importRun.findMany({
    orderBy: { importedAt: "desc" },
    take: 10,
  });

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Import Excel"
        description="Upload either source workbook to load or refresh its data. Existing records are matched by their natural key (ICS, part code, PO number, etc.) and updated in place — records you added manually through the site are never deleted by an import."
      />

      <ImportForm />

      <h2 className="mt-8 mb-2 text-sm font-semibold text-slate-900">Recent imports</h2>
      {recentRuns.length === 0 ? (
        <p className="text-sm text-slate-500">No imports yet.</p>
      ) : (
        <div className={t.tableWrap}>
          <table className={t.table}>
            <thead className={t.thead}>
              <tr>
                <th className={t.th}>File</th>
                <th className={t.th}>Source</th>
                <th className={t.th}>Imported At</th>
              </tr>
            </thead>
            <tbody className={t.tbody}>
              {recentRuns.map((run) => (
                <tr key={run.id} className={t.tr}>
                  <td className={`${t.td} font-medium text-slate-900`}>{run.fileName}</td>
                  <td className={t.td}>{run.sourceFile}</td>
                  <td className={t.tdMuted}>
                    {run.importedAt.toISOString().slice(0, 19).replace("T", " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
