import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field } from "@/components/ui/Field";
import { Button, LinkButton } from "@/components/ui/Button";
import { toDateInputValue } from "@/lib/format";
import { updateReceivingRecord } from "../../actions";

export default async function EditReceivingRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await prisma.receivingRecord.findUnique({ where: { id } });
  if (!record) notFound();

  const updateWithId = updateReceivingRecord.bind(null, id);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Edit Receiving Record" description={`ICS ${record.ics}`} />
      <form
        action={updateWithId}
        className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field name="no" label="No." type="number" defaultValue={record.no} required />
          <Field name="ics" label="ICS" defaultValue={record.ics} required />
          <Field name="partName" label="Part Name" defaultValue={record.partName} />
          <Field name="supplier" label="Supplier" defaultValue={record.supplier} />
          <Field name="maker" label="Maker" defaultValue={record.maker} />
          <Field name="commodity" label="Commodity" defaultValue={record.commodity} />
          <Field name="price" label="Price" type="number" step="any" defaultValue={record.price} />
          <Field name="poNumber" label="PO #" defaultValue={record.poNumber} />
          <Field name="etd" label="ETD" type="date" defaultValue={toDateInputValue(record.etd)} />
          <Field name="eta" label="ETA" type="date" defaultValue={toDateInputValue(record.eta)} />
          <Field name="qty" label="Qty" type="number" step="any" defaultValue={record.qty} />
          <Field
            name="inTransit"
            label="In Transit"
            type="number"
            step="any"
            defaultValue={record.inTransit}
          />
        </div>
        <Field name="remarks" label="Remarks" defaultValue={record.remarks} />
        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <Button type="submit">Save</Button>
          <LinkButton href="/receiving-report" variant="secondary">
            Cancel
          </LinkButton>
        </div>
      </form>
    </div>
  );
}
