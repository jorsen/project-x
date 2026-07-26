import Link from "next/link";
import { auth } from "@/auth";
import { navSections } from "@/lib/nav";
import { signOutAction } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = session?.user?.role;

  return (
    <div className="flex min-h-screen w-full">
      <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-gray-50 p-4">
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-900">Stock &amp; Sales Tracker</p>
        </div>
        <nav className="flex-1 space-y-5">
          {navSections.map((section) => {
            const items = section.items.filter((item) => !item.adminOnly || role === "ADMIN");
            if (items.length === 0) return null;
            return (
              <div key={section.heading}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {section.heading}
                </p>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="block rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
        <div className="mt-6 border-t border-gray-200 pt-4 text-xs text-gray-500">
          <p className="truncate">{session?.user?.email}</p>
          <p className="mb-2">{role}</p>
          <form action={signOutAction}>
            <button type="submit" className="text-gray-700 underline hover:text-gray-900">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto p-8">{children}</main>
    </div>
  );
}
