import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/authz";
import { DeleteButton } from "@/components/ui/DeleteButton";
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

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Ecomp Part Detail</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/ecomp-parts"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Back to list
          </Link>
          {editable && (
            <Link
              href={`/ecomp-parts/${part.id}/edit`}
              className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-md border border-gray-200 bg-white p-4">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">No.</dt>
            <dd className="text-gray-900">{part.no}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Part Number</dt>
            <dd className="text-gray-900">{part.partNumber}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Category</dt>
            <dd className="text-gray-900">{part.category}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">ICS</dt>
            <dd className="text-gray-900">{part.ics}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Maker</dt>
            <dd className="text-gray-900">{part.maker}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Inventory Qty</dt>
            <dd className="text-gray-900">{part.inventoryQty}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Inventory As Of</dt>
            <dd className="text-gray-900">{part.inventoryAsOf?.toISOString().slice(0, 10)}</dd>
          </div>
        </dl>
      </div>

      <h2 className="mb-2 text-lg font-semibold text-gray-900">Customer Weekly Demand</h2>

      <div className="mb-4 overflow-x-auto rounded-md border border-gray-200">
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
            {part.demands.map((d) => (
              <tr key={d.id}>
                <td className="px-3 py-2">{d.customerCode}</td>
                <td className="px-3 py-2">{d.qty}</td>
                <td className="px-3 py-2">{d.updatedAt.toISOString().slice(0, 10)}</td>
                {editable && (
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <DeleteButton action={deleteCustomerDemand.bind(null, d.id)} />
                  </td>
                )}
              </tr>
            ))}
            {part.demands.length === 0 && (
              <tr>
                <td colSpan={editable ? 4 : 3} className="px-3 py-2 text-center text-gray-500">
                  No demand records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editable && (
        <form action={upsertDemandForPart} className="flex items-end gap-3">
          <div className="space-y-1">
            <label htmlFor="customerCode" className="block text-sm font-medium text-gray-700">
              Customer Code
            </label>
            <input
              id="customerCode"
              name="customerCode"
              type="text"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="qty" className="block text-sm font-medium text-gray-700">
              Qty
            </label>
            <input
              id="qty"
              name="qty"
              type="number"
              step="any"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Add / Update
          </button>
        </form>
      )}
    </div>
  );
}
