import { Field } from "@/components/ui/Field";
import { createOpenPoLine } from "../actions";

export default function NewOpenPoLinePage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">New Open PO Line</h1>
      <form action={createOpenPoLine} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="sourceSheet" className="block text-sm font-medium text-gray-700">
              Source Sheet
            </label>
            <select
              id="sourceSheet"
              name="sourceSheet"
              required
              defaultValue="SUPPLIER"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            >
              <option value="SUPPLIER">SUPPLIER</option>
              <option value="AMOUNT">AMOUNT</option>
            </select>
          </div>
          <Field name="no" label="No." />
          <Field name="partNumber" label="Part Number" />
          <Field name="category" label="Category" />
          <Field name="ics" label="ICS" required />
          <Field name="maker" label="Maker" />
          <Field name="unitPrice" label="Unit Price" type="number" step="any" />
        </div>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Create
        </button>
      </form>
    </div>
  );
}
