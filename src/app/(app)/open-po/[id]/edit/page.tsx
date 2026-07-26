import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Field } from "@/components/ui/Field";
import { updateOpenPoLine } from "../../actions";

export default async function EditOpenPoLinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await prisma.openPoLine.findUnique({ where: { id } });
  if (!record) notFound();

  const updateWithId = updateOpenPoLine.bind(null, id);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Edit Open PO Line</h1>
      <form action={updateWithId} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="sourceSheet" className="block text-sm font-medium text-gray-700">
              Source Sheet
            </label>
            <select
              id="sourceSheet"
              name="sourceSheet"
              required
              defaultValue={record.sourceSheet}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            >
              <option value="SUPPLIER">SUPPLIER</option>
              <option value="AMOUNT">AMOUNT</option>
            </select>
          </div>
          <Field name="no" label="No." defaultValue={record.no} />
          <Field name="partNumber" label="Part Number" defaultValue={record.partNumber} />
          <Field name="category" label="Category" defaultValue={record.category} />
          <Field name="ics" label="ICS" defaultValue={record.ics} required />
          <Field name="maker" label="Maker" defaultValue={record.maker} />
          <Field
            name="unitPrice"
            label="Unit Price"
            type="number"
            step="any"
            defaultValue={record.unitPrice}
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
