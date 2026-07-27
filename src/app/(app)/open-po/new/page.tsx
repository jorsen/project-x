import { PageHeader } from "@/components/ui/PageHeader";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Button, LinkButton } from "@/components/ui/Button";
import { createOpenPoLine } from "../actions";

export default function NewOpenPoLinePage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="New Open PO Line" />
      <form
        action={createOpenPoLine}
        className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            name="sourceSheet"
            label="Source Sheet"
            required
            defaultValue="SUPPLIER"
            options={[
              { value: "SUPPLIER", label: "Supplier" },
              { value: "AMOUNT", label: "Amount" },
            ]}
          />
          <Field name="no" label="No." />
          <Field name="partNumber" label="Part Number" />
          <Field name="category" label="Category" />
          <Field name="ics" label="ICS" required />
          <Field name="maker" label="Maker" />
          <Field name="unitPrice" label="Unit Price" type="number" step="any" />
        </div>
        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <Button type="submit">Create</Button>
          <LinkButton href="/open-po" variant="secondary">
            Cancel
          </LinkButton>
        </div>
      </form>
    </div>
  );
}
