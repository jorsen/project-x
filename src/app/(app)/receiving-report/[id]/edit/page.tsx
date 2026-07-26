import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Field } from "@/components/ui/Field";
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
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Edit Receiving Record</h1>
      <form action={updateWithId} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
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
