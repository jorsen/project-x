import { PageHeader } from "@/components/ui/PageHeader";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Button, LinkButton } from "@/components/ui/Button";
import { CLASSIFICATION_OPTIONS } from "@/lib/classification";
import { createJscphPart } from "../actions";

export default function NewJscphPartPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="New JSCPH Part" />
      <form
        action={createJscphPart}
        className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field name="code" label="Code" required />
          <Select name="classification" label="Classification" options={CLASSIFICATION_OPTIONS} />
          <Field name="partName" label="Part Name" />
          <Field name="modelName" label="Model Name" />
          <Field name="spq" label="SPQ" type="number" step="any" />
          <Field name="unitPricePurchase" label="Unit Price Purchase" type="number" step="any" />
          <Field name="unitPriceSales" label="Unit Price Sales" type="number" step="any" />
        </div>
        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <Button type="submit">Create</Button>
          <LinkButton href="/jscph-parts" variant="secondary">
            Cancel
          </LinkButton>
        </div>
      </form>
    </div>
  );
}
