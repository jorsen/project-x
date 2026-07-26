import { Field } from "@/components/ui/Field";
import { createJscphPart } from "../actions";

export default function NewJscphPartPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">New JSCPH Part</h1>
      <form action={createJscphPart} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field name="code" label="Code" required />
          <Field name="ics1" label="ICS1" />
          <Field name="partName" label="Part Name" />
          <Field name="modelName" label="Model Name" />
          <Field name="spq" label="SPQ" type="number" step="any" />
          <Field name="unitPricePurchase" label="Unit Price Purchase" type="number" step="any" />
          <Field name="unitPriceSales" label="Unit Price Sales" type="number" step="any" />
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
