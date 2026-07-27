import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Button, LinkButton } from "@/components/ui/Button";
import { getProductCategories } from "@/lib/categories";
import { updateProduct } from "../../actions";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    getProductCategories(),
  ]);
  if (!product) notFound();

  const updateWithId = updateProduct.bind(null, id);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Edit Product" description={`No. ${product.no}`} />
      <form
        action={updateWithId}
        className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field name="ics" label="ICS" defaultValue={product.ics} />
          <Field name="materialName" label="Material Name" defaultValue={product.materialName} />
          <Field name="partNumber" label="Part Number" defaultValue={product.partNumber} />
          <Select
            name="category"
            label="Category"
            defaultValue={product.category}
            options={[
              { value: "", label: "— None —" },
              ...categories.map((c) => ({ value: c, label: c })),
            ]}
          />
          <Field name="spq" label="SPQ" type="number" step="1" defaultValue={product.spq} />
          <Field
            name="delivery"
            label="Delivery"
            type="number"
            step="any"
            defaultValue={product.delivery}
            description="Must divide evenly into whole boxes of SPQ."
          />
          <Field
            name="unitPrice"
            label="Unit Price"
            type="number"
            step="any"
            defaultValue={product.unitPrice}
          />
          <Field
            name="oldUnitPrice"
            label="Old Unit Price"
            type="number"
            step="any"
            defaultValue={product.oldUnitPrice}
          />
        </div>
        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <Button type="submit">Save</Button>
          <LinkButton href="/additional-options" variant="secondary">
            Cancel
          </LinkButton>
        </div>
      </form>
    </div>
  );
}
