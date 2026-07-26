import { Field } from "@/components/ui/Field";
import { createEcompPart } from "../actions";

export default function NewEcompPartPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">New Ecomp Part</h1>
      <form action={createEcompPart} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field name="no" label="No." />
          <Field name="partNumber" label="Part Number" />
          <Field name="category" label="Category" />
          <Field name="ics" label="ICS" required />
          <Field name="maker" label="Maker" />
          <Field name="inventoryQty" label="Inventory Qty" type="number" step="any" />
          <Field name="inventoryAsOf" label="Inventory As Of" type="date" />
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
