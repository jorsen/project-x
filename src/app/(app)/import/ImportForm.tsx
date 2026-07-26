"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { importExcelAction, type ImportActionState } from "./actions";

const initialState: ImportActionState = { error: null, summary: null, fileName: null };

const fileInputClassName =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition-shadow focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function ImportForm() {
  const [state, formAction, pending] = useActionState(importExcelAction, initialState);

  return (
    <div className="space-y-6">
      <form
        action={formAction}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <Select
          name="sourceFile"
          label="Which workbook is this?"
          required
          options={[
            { value: "ECOMP", label: "E-Components Stock Trend" },
            { value: "JSCPH", label: "JSCPH Stock Trend" },
          ]}
        />

        <div className="space-y-1">
          <label htmlFor="file" className="block text-sm font-medium text-slate-700">
            .xlsx file
            <span className="ml-0.5 text-red-500">*</span>
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".xlsx"
            required
            className={fileInputClassName}
          />
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <Button type="submit" disabled={pending}>
          {pending ? "Importing... this can take a minute" : "Import"}
        </Button>
      </form>

      {state.summary && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Import complete</p>
              <p className="text-xs text-slate-500">{state.fileName}</p>
            </div>
          </div>
          <dl className="divide-y divide-slate-100 text-sm">
            {"entities" in state.summary &&
              Object.entries(state.summary.entities).map(([name, counts]) => (
                <div key={name} className="flex items-center justify-between py-2">
                  <dt className="text-slate-600">{name}</dt>
                  <dd className="font-medium text-slate-900">
                    {counts.created} created, {counts.updated} updated
                  </dd>
                </div>
              ))}
            {"computedSheets" in state.summary &&
              Object.entries(state.summary.computedSheets).map(([name, count]) => (
                <div key={name} className="flex items-center justify-between py-2">
                  <dt className="text-slate-600">Report &quot;{name}&quot;</dt>
                  <dd className="font-medium text-slate-900">{count} rows refreshed</dd>
                </div>
              ))}
          </dl>
        </div>
      )}
    </div>
  );
}
