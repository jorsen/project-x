import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Button, LinkButton } from "@/components/ui/Button";
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
      <PageHeader title="Edit Open PO Line" description={`ICS ${record.ics}`} />
      <form
        action={updateWithId}
        className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-2 gap-4">
          <Select
            name="sourceSheet"
            label="Source Sheet"
            required
            defaultValue={record.sourceSheet}
            options={[
              { value: "SUPPLIER", label: "Supplier" },
              { value: "AMOUNT", label: "Amount" },
            ]}
          />
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
        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <Button type="submit">Save</Button>
          <LinkButton href="/open-po" variant="secondary">
            Cancel
          </LinkButton>
        </div>
      </form>
    </div>
  );
}
