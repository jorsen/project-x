import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/authz";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field } from "@/components/ui/Field";
import { Button, LinkButton } from "@/components/ui/Button";
import * as t from "@/components/ui/table";
import { deleteCustomerDemand, upsertCustomerDemand } from "../actions";

export default async function EcompPartDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const editable = canEdit(session?.user?.role);

  const part = await prisma.ecompPart.findUnique({
    where: { id },
    include: { demands: { orderBy: { customerCode: "asc" } } },
  });
  if (!part) notFound();

  const upsertDemandForPart = upsertCustomerDemand.bind(null, part.id);

  const fields: { label: string; value: string | number | null }[] = [
    { label: "No.", value: part.no },
    { label: "Part Number", value: part.partNumber },
    { label: "Category", value: part.category },
    { label: "ICS", value: part.ics },
    { label: "Maker", value: part.maker },
    { label: "Inventory Qty", value: part.inventoryQty },
    { label: "Inventory As Of", value: part.inventoryAsOf?.toISOString().slice(0, 10) ?? null },
  ];

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Ecomp Part Detail"
        description={part.ics}
        actions={
          <>
            <LinkButton href="/ecomp-parts" variant="secondary">
              Back to list
            </LinkButton>
            {editable && <LinkButton href={`/ecomp-parts/${part.id}/edit`}>Edit</LinkButton>}
          </>
        }
      />

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {fields.map((f) => (
            <div key={f.label}>
              <dt className="text-xs font-medium text-slate-500">{f.label}</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {f.value ?? <span className="text-slate-300">—</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <h2 className="mb-2 text-lg font-semibold text-slate-900">Customer Weekly Demand</h2>

      <div className={`mb-4 ${t.tableWrap}`}>
        <table className={t.table}>
          <thead className={t.thead}>
            <tr>
              <th className={t.th}>Customer Code</th>
              <th className={t.thNum}>Qty</th>
              <th className={t.th}>Updated At</th>
              {editable && <th className={t.th} />}
            </tr>
          </thead>
          <tbody className={t.tbody}>
            {part.demands.map((d) => (
              <tr key={d.id} className={t.tr}>
                <td className={`${t.td} font-medium text-slate-900`}>{d.customerCode}</td>
                <td className={t.tdNum}>{d.qty ?? <span className="text-slate-300">—</span>}</td>
                <td className={t.td}>{d.updatedAt.toISOString().slice(0, 10)}</td>
                {editable && (
                  <td className={t.tdActions}>
                    <div className="flex items-center justify-end">
                      <DeleteButton action={deleteCustomerDemand.bind(null, d.id)} />
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {part.demands.length === 0 && (
              <tr>
                <td colSpan={editable ? 4 : 3} className={`${t.td} text-center text-slate-400`}>
                  No demand records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editable && (
        <form
          action={upsertDemandForPart}
          className="flex items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="w-40">
            <Field name="customerCode" label="Customer Code" required />
          </div>
          <div className="w-32">
            <Field name="qty" label="Qty" type="number" step="any" />
          </div>
          <Button type="submit">Add / Update</Button>
        </form>
      )}
    </div>
  );
}
