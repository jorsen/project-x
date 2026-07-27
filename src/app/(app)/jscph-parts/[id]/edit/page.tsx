import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field } from "@/components/ui/Field";
import { Button, LinkButton } from "@/components/ui/Button";
import { updateJscphPart } from "../../actions";

export default async function EditJscphPartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const part = await prisma.jscphPart.findUnique({ where: { id } });
  if (!part) notFound();

  const updateWithId = updateJscphPart.bind(null, id);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Edit JSCPH Part" description={`Code ${part.code}`} />
      <form
        action={updateWithId}
        className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field name="code" label="Code" defaultValue={part.code} required />
          <Field name="ics1" label="ICS1" defaultValue={part.ics1} />
          <Field name="partName" label="Part Name" defaultValue={part.partName} />
          <Field name="modelName" label="Model Name" defaultValue={part.modelName} />
          <Field name="spq" label="SPQ" type="number" step="any" defaultValue={part.spq} />
          <Field
            name="unitPricePurchase"
            label="Unit Price Purchase"
            type="number"
            step="any"
            defaultValue={part.unitPricePurchase}
          />
          <Field
            name="unitPriceSales"
            label="Unit Price Sales"
            type="number"
            step="any"
            defaultValue={part.unitPriceSales}
          />
        </div>
        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <Button type="submit">Save</Button>
          <LinkButton href="/jscph-parts" variant="secondary">
            Cancel
          </LinkButton>
        </div>
      </form>
    </div>
  );
}
