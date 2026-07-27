import Link from "next/link";
import Form from "next/form";
import { BarChart3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const allGroups = await prisma.computedSheetSnapshot.groupBy({
    by: ["sourceFile", "sheetName"],
    _count: true,
    orderBy: [{ sourceFile: "asc" }, { sheetName: "asc" }],
  });

  const query = q?.trim().toLowerCase();
  const groups = query
    ? allGroups.filter(
        (g) =>
          g.sheetName.toLowerCase().includes(query) ||
          g.sourceFile.toLowerCase().includes(query),
      )
    : allGroups;

  return (
    <div>
      <PageHeader
        title="Computed Reports"
        description="Read-only snapshots of formula-derived sheets from the last import."
      />

      {allGroups.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No computed reports imported yet"
          description="Use the Import page to load an Excel file."
          action={<LinkButton href="/import">Go to Import</LinkButton>}
        />
      ) : (
        <>
          <Form action="" className="mb-4 flex gap-2">
            <SearchInput defaultValue={q} placeholder="Search reports by sheet name..." />
          </Form>
          {groups.length === 0 && (
            <EmptyState icon={BarChart3} title="No reports match your search." />
          )}
        </>
      )}

      {groups.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Link
              key={`${g.sourceFile}::${g.sheetName}`}
              href={`/reports/${encodeURIComponent(g.sourceFile)}/${encodeURIComponent(g.sheetName)}`}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
            >
              <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                {g.sourceFile}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">{g.sheetName}</p>
              <p className="mt-2 text-xs text-slate-500">{g._count} row(s)</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
