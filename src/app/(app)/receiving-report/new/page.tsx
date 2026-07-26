import { Field } from "@/components/ui/Field";
import { createReceivingRecord } from "../actions";

export default function NewReceivingRecordPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">New Receiving Record</h1>
      <form action={createReceivingRecord} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field name="no" label="No." type="number" required />
          <Field name="ics" label="ICS" required />
          <Field name="partName" label="Part Name" />
          <Field name="supplier" label="Supplier" />
          <Field name="maker" label="Maker" />
          <Field name="commodity" label="Commodity" />
          <Field name="price" label="Price" type="number" step="any" />
          <Field name="poNumber" label="PO #" />
          <Field name="etd" label="ETD" type="date" />
          <Field name="eta" label="ETA" type="date" />
          <Field name="qty" label="Qty" type="number" step="any" />
          <Field name="inTransit" label="In Transit" type="number" step="any" />
        </div>
        <Field name="remarks" label="Remarks" />
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
