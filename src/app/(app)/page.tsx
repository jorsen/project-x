import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { navSections } from "@/lib/nav";
import { navIcons } from "@/lib/navIcons";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function DashboardPage() {
  const session = await auth();
  const role = session?.user?.role;

  const [receiving, ecomp, openPo, jscph] = await Promise.all([
    prisma.receivingRecord.count(),
    prisma.ecompPart.count(),
    prisma.openPoLine.count(),
    prisma.jscphPart.count(),
  ]);

  const counts: Record<string, number> = {
    "/receiving-report": receiving,
    "/ecomp-parts": ecomp,
    "/open-po": openPo,
    "/jscph-parts": jscph,
  };

  return (
    <div>
      <PageHeader
        title={`Welcome back${session?.user?.name ? `, ${session.user.name}` : ""}`}
        description="Pick a section below or from the sidebar."
      />

      <div className="space-y-8">
        {navSections.map((section) => {
          const items = section.items.filter((item) => !item.adminOnly || role === "ADMIN");
          if (items.length === 0) return null;
          return (
            <div key={section.heading}>
              <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                {section.heading}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => {
                  const Icon = navIcons[item.icon];
                  const count = counts[item.href];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{item.label}</p>
                        {count !== undefined && (
                          <p className="mt-0.5 text-xs text-slate-500">{count} records</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
