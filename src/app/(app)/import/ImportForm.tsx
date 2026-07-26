"use client";

import { useActionState } from "react";
import { importExcelAction, type ImportActionState } from "./actions";

const initialState: ImportActionState = { error: null, summary: null, fileName: null };

export function ImportForm() {
  const [state, formAction, pending] = useActionState(importExcelAction, initialState);

  return (
    <div className="space-y-6">
      <form action={formAction} className="max-w-lg space-y-4 rounded-md border border-gray-200 p-4">
        <div className="space-y-1">
          <label htmlFor="sourceFile" className="block text-sm font-medium text-gray-700">
            Which workbook is this?
          </label>
          <select
            id="sourceFile"
            name="sourceFile"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="ECOMP">E-Components Stock Trend</option>
            <option value="JSCPH">JSCPH Stock Trend</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="file" className="block text-sm font-medium text-gray-700">
            .xlsx file
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".xlsx"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-gray-800"
        >
          {pending ? "Importing... this can take a minute" : "Import"}
        </button>
      </form>

      {state.summary && (
        <div className="max-w-2xl rounded-md border border-green-200 bg-green-50 p-4">
          <p className="mb-2 text-sm font-medium text-green-900">
            Imported {state.fileName} successfully.
          </p>
          <div className="space-y-1 text-sm text-green-900">
            {"entities" in state.summary &&
              Object.entries(state.summary.entities).map(([name, counts]) => (
                <p key={name}>
                  {name}: {counts.created} created, {counts.updated} updated
                </p>
              ))}
            {"computedSheets" in state.summary &&
              Object.entries(state.summary.computedSheets).map(([name, count]) => (
                <p key={name}>
                  Report &quot;{name}&quot;: {count} rows refreshed
                </p>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
