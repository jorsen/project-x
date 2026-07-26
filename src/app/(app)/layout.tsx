import Link from "next/link";
import { LayoutDashboard, LogOut } from "lucide-react";
import { auth } from "@/auth";
import { navSections } from "@/lib/nav";
import { NavLink } from "@/components/ui/NavLink";
import { RoleBadge } from "@/components/ui/Badge";
import { signOutAction } from "./actions";

function initials(name: string) {
  const parts = name.split(/[.\s_-]+/).filter(Boolean);
  const chars = parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return chars.toUpperCase();
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = session?.user?.role;
  const identity = session?.user?.name ?? session?.user?.employeeNumber ?? "?";

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <Link
          href="/"
          className="flex items-center gap-2 border-b border-slate-200 px-4 py-4 hover:bg-slate-50"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600">
            <LayoutDashboard className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-900">Stock &amp; Sales Tracker</span>
        </Link>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navSections.map((section) => {
            const items = section.items.filter((item) => !item.adminOnly || role === "ADMIN");
            if (items.length === 0) return null;
            return (
              <div key={section.heading}>
                <p className="mb-1 px-2.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  {section.heading}
                </p>
                <ul className="space-y-0.5">
                  {items.map((item) => (
                    <li key={item.href}>
                      <NavLink href={item.href} label={item.label} icon={item.icon} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-2.5 rounded-md px-1 py-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              {initials(identity)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{identity}</p>
              {role && <RoleBadge role={role} />}
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                title="Sign out"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto p-6 sm:p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
