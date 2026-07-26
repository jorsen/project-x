"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutDashboard, AlertCircle } from "lucide-react";
import { loginAction } from "./actions";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [state, formAction, pending] = useActionState(loginAction, { error: null });

  return (
    <form
      action={formAction}
      className="w-full max-w-sm space-y-5 rounded-xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-900/5"
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
          <LayoutDashboard className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-lg font-semibold text-slate-900">Stock &amp; Sales Tracker</h1>
        <p className="text-sm text-slate-500">Sign in to continue</p>
      </div>

      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div className="space-y-1">
        <label htmlFor="employeeNumber" className="block text-sm font-medium text-slate-700">
          Employee Number
        </label>
        <input
          id="employeeNumber"
          name="employeeNumber"
          type="text"
          required
          autoFocus
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {state.error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
