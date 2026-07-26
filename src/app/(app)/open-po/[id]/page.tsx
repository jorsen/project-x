import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/authz";
import { Field } from "@/components/ui/Field";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { deleteOpenPoCustomerDemand, upsertOpenPoCustomerDemand } from "../actions";

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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Open PO Line</h1>
        {editable && (
          <Link
            href={`/open-po/${line.id}/edit`}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Edit
          </Link>
        )}
      </div>

      <div className="mb-8 grid max-w-2xl grid-cols-2 gap-x-4 gap-y-3 rounded-md border border-gray-200 bg-white p-4 text-sm">
        <div>
          <div className="text-gray-500">Source Sheet</div>
          <div className="font-medium text-gray-900">{line.sourceSheet}</div>
        </div>
        <div>
          <div className="text-gray-500">No.</div>
          <div className="font-medium text-gray-900">{line.no}</div>
        </div>
        <div>
          <div className="text-gray-500">Part Number</div>
          <div className="font-medium text-gray-900">{line.partNumber}</div>
        </div>
        <div>
          <div className="text-gray-500">Category</div>
          <div className="font-medium text-gray-900">{line.category}</div>
        </div>
        <div>
          <div className="text-gray-500">ICS</div>
          <div className="font-medium text-gray-900">{line.ics}</div>
        </div>
        <div>
          <div className="text-gray-500">Maker</div>
          <div className="font-medium text-gray-900">{line.maker}</div>
        </div>
        <div>
          <div className="text-gray-500">Unit Price</div>
          <div className="font-medium text-gray-900">{line.unitPrice}</div>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-gray-900">Customer Demand</h2>

      <div className="mb-6 overflow-x-auto rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Customer Code</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Qty</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Updated At</th>
              {editable && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {line.demands.map((d) => (
              <tr key={d.id}>
                <td className="px-3 py-2">{d.customerCode}</td>
                <td className="px-3 py-2">{d.qty}</td>
                <td className="px-3 py-2">{d.updatedAt.toISOString().slice(0, 10)}</td>
                {editable && (
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <DeleteButton action={deleteOpenPoCustomerDemand.bind(null, d.id)} />
                  </td>
                )}
              </tr>
            ))}
            {line.demands.length === 0 && (
              <tr>
                <td colSpan={editable ? 4 : 3} className="px-3 py-4 text-center text-gray-500">
                  No customer demand recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editable && (
        <div className="max-w-md rounded-md border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Add / Update Customer Demand</h3>
          <form action={upsertDemand} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field name="customerCode" label="Customer Code" required />
              <Field name="qty" label="Qty" type="number" step="any" />
            </div>
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Save
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
