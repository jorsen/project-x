import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field } from "@/components/ui/Field";
import { Button, LinkButton } from "@/components/ui/Button";
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
      <PageHeader title="Edit Ecomp Part" description={`ICS ${part.ics}`} />
      <form
        action={updateWithId}
        className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
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
        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <Button type="submit">Save</Button>
          <LinkButton href="/ecomp-parts" variant="secondary">
            Cancel
          </LinkButton>
        </div>
      </form>
    </div>
  );
}
