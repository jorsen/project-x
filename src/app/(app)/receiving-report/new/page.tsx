import { PageHeader } from "@/components/ui/PageHeader";
import { Field } from "@/components/ui/Field";
import { Button, LinkButton } from "@/components/ui/Button";
import { createReceivingRecord } from "../actions";

export default function NewReceivingRecordPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="New Receiving Record" />
      <form
        action={createReceivingRecord}
        className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
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
        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <Button type="submit">Create</Button>
          <LinkButton href="/receiving-report" variant="secondary">
            Cancel
          </LinkButton>
        </div>
      </form>
    </div>
  );
}
