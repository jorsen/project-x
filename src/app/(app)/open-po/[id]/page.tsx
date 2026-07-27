import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/authz";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field } from "@/components/ui/Field";
import { Button, LinkButton } from "@/components/ui/Button";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { SourceSheetBadge } from "@/components/ui/Badge";
import * as t from "@/components/ui/table";
import { deleteOpenPoCustomerDemand, upsertOpenPoCustomerDemand } from "../actions";

function InfoField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="text-sm text-slate-900">{value ?? <span className="text-slate-300">—</span>}</div>
    </div>
  );
}

export default async function OpenPoLineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const editable = canEdit(session?.user?.role);

  const line = await prisma.openPoLine.findUnique({
    where: { id },
    include: { demands: { orderBy: { customerCode: "asc" } } },
  });
  if (!line) notFound();

  const upsertDemand = upsertOpenPoCustomerDemand.bind(null, line.id);

  return (
    <div>
      <PageHeader
        title="Open PO Line"
        description={line.ics}
        actions={
          editable && <LinkButton href={`/open-po/${line.id}/edit`}>Edit</LinkButton>
        }
      />

      <div className="mb-8 grid max-w-2xl grid-cols-1 gap-x-4 gap-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
        <InfoField label="Source Sheet" value={<SourceSheetBadge sourceSheet={line.sourceSheet} />} />
        <InfoField label="No." value={line.no} />
        <InfoField label="Part Number" value={line.partNumber} />
        <InfoField label="Category" value={line.category} />
        <InfoField label="ICS" value={line.ics} />
        <InfoField label="Maker" value={line.maker} />
        <InfoField label="Unit Price" value={line.unitPrice} />
      </div>

      <h2 className="mb-3 text-lg font-semibold text-slate-900">Customer Demand</h2>

      <div className={`mb-6 ${t.tableWrap}`}>
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
            {line.demands.map((d) => (
              <tr key={d.id} className={t.tr}>
                <td className={`${t.td} font-medium text-slate-900`}>{d.customerCode}</td>
                <td className={t.tdNum}>{d.qty ?? <span className="text-slate-300">—</span>}</td>
                <td className={t.td}>{d.updatedAt.toISOString().slice(0, 10)}</td>
                {editable && (
                  <td className={t.tdActions}>
                    <DeleteButton action={deleteOpenPoCustomerDemand.bind(null, d.id)} />
                  </td>
                )}
              </tr>
            ))}
            {line.demands.length === 0 && (
              <tr>
                <td colSpan={editable ? 4 : 3} className={`${t.tdMuted} text-center`}>
                  No customer demand recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editable && (
        <div className="max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Add / Update Customer Demand</h3>
          <form action={upsertDemand} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field name="customerCode" label="Customer Code" required />
              <Field name="qty" label="Qty" type="number" step="any" />
            </div>
            <Button type="submit" size="sm">
              Save
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
