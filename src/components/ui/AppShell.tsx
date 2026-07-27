"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, LayoutDashboard, LogOut } from "lucide-react";
import { NavLink } from "./NavLink";
import { RoleBadge } from "./Badge";
import type { NavSection } from "@/lib/nav";

function initials(name: string) {
  const parts = name.split(/[.\s_-]+/).filter(Boolean);
  const chars = parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return chars.toUpperCase();
}

export function AppShell({
  navSections,
  role,
  identity,
  signOutAction,
  children,
}: {
  navSections: NavSection[];
  role?: "ADMIN" | "VIEWER";
  identity: string;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <Link href="/" className="flex items-center gap-2" onClick={close}>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600">
            <LayoutDashboard className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-900">Stock &amp; Sales Tracker</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out md:static md:w-64 md:max-w-none md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80" onClick={close}>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600">
              <LayoutDashboard className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Stock &amp; Sales Tracker</span>
          </Link>
          <button
            type="button"
            onClick={close}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navSections.map((section) => {
            const items = section.items.filter((item) => !item.adminOnly || role === "ADMIN");
            if (items.length === 0) return null;
            return (
              <div key={section.heading}>
                <p className="mb-1 px-2.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  {section.heading}
                </p>
                <ul className="space-y-0.5" onClick={close}>
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

      <main className="min-w-0 flex-1 overflow-x-auto p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
