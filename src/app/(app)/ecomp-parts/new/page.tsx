import { PageHeader } from "@/components/ui/PageHeader";
import { Field } from "@/components/ui/Field";
import { Button, LinkButton } from "@/components/ui/Button";
import { createEcompPart } from "../actions";

export default function NewEcompPartPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="New Ecomp Part" />
      <form
        action={createEcompPart}
        className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field name="no" label="No." />
          <Field name="partNumber" label="Part Number" />
          <Field name="category" label="Category" />
          <Field name="ics" label="ICS" required />
          <Field name="maker" label="Maker" />
          <Field name="inventoryQty" label="Inventory Qty" type="number" step="any" />
          <Field name="inventoryAsOf" label="Inventory As Of" type="date" />
        </div>
        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <Button type="submit">Create</Button>
          <LinkButton href="/ecomp-parts" variant="secondary">
            Cancel
          </LinkButton>
        </div>
      </form>
    </div>
  );
}
