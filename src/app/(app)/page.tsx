import Link from "next/link";
import { navSections } from "@/lib/nav";

export default function DashboardPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-600">
        Pick a section from the sidebar, or jump in below.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {navSections
          .flatMap((s) => s.items)
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md border border-gray-200 px-4 py-3 text-sm font-medium text-gray-800 hover:border-gray-400 hover:bg-gray-50"
            >
              {item.label}
            </Link>
          ))}
      </div>
    </div>
  );
}
