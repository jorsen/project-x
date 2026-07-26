import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Field } from "@/components/ui/Field";
import { toDateInputValue } from "@/lib/format";
import { updateEcompPart } from "../../actions";

export default async function EditEcompPartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const part = await prisma.ecompPart.findUnique({ where: { id } });
  if (!part) notFound();

  const updateWithId = updateEcompPart.bind(null, id);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Edit Ecomp Part</h1>
      <form action={updateWithId} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field name="no" label="No." defaultValue={part.no} />
          <Field name="partNumber" label="Part Number" defaultValue={part.partNumber} />
          <Field name="category" label="Category" defaultValue={part.category} />
          <Field name="ics" label="ICS" defaultValue={part.ics} required />
          <Field name="maker" label="Maker" defaultValue={part.maker} />
          <Field
            name="inventoryQty"
            label="Inventory Qty"
            type="number"
            step="any"
            defaultValue={part.inventoryQty}
          />
          <Field
            name="inventoryAsOf"
            label="Inventory As Of"
            type="date"
            defaultValue={toDateInputValue(part.inventoryAsOf)}
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
