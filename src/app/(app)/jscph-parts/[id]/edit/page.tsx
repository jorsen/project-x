import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Field } from "@/components/ui/Field";
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
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Edit JSCPH Part</h1>
      <form action={updateWithId} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
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
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Save
        </button>
      </form>
    </div>
  );
}
