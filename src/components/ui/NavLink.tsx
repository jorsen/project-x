"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navIcons } from "@/lib/navIcons";
import type { NavIconName } from "@/lib/nav";

export function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: NavIconName;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const Icon = navIcons[icon];

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-indigo-50 text-indigo-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500"}`}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}
