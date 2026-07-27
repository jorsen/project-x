import { PageHeader } from "@/components/ui/PageHeader";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Button, LinkButton } from "@/components/ui/Button";
import { getProductCategories } from "@/lib/categories";
import { createProduct } from "../actions";

export default async function NewProductPage() {
  const categories = await getProductCategories();

  return (
    <div className="max-w-2xl">
      <PageHeader title="New Product" description="No. is assigned automatically." />
      <form
        action={createProduct}
        className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field name="ics" label="ICS" />
          <Field name="materialName" label="Material Name" />
          <Field name="partNumber" label="Part Number" />
          <Select
            name="category"
            label="Category"
            options={[
              { value: "", label: "— None —" },
              ...categories.map((c) => ({ value: c, label: c })),
            ]}
          />
          <Field name="spq" label="SPQ" type="number" step="1" />
          <Field
            name="delivery"
            label="Delivery"
            type="number"
            step="any"
            description="Must divide evenly into whole boxes of SPQ."
          />
          <Field name="unitPrice" label="Unit Price" type="number" step="any" />
          <Field name="oldUnitPrice" label="Old Unit Price" type="number" step="any" />
        </div>
        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <Button type="submit">Create</Button>
          <LinkButton href="/additional-options" variant="secondary">
            Cancel
          </LinkButton>
        </div>
      </form>
    </div>
  );
}
