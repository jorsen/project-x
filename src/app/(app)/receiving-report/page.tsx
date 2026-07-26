import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/authz";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { deleteReceivingRecord } from "./actions";

export default async function ReceivingReportPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await auth();
  const editable = canEdit(session?.user?.role);

  const records = await prisma.receivingRecord.findMany({
    where: q
      ? {
          OR: [
            { ics: { contains: q, mode: "insensitive" } },
            { partName: { contains: q, mode: "insensitive" } },
            { poNumber: { contains: q, mode: "insensitive" } },
            { supplier: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { no: "asc" },
    take: 200,
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Receiving Report</h1>
          <p className="text-sm text-gray-500">{records.length} record(s) shown (max 200)</p>
        </div>
        {editable && (
          <Link
            href="/receiving-report/new"
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            New record
          </Link>
        )}
      </div>

      <form className="mb-4">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search ICS, part name, PO#, supplier..."
          className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </form>

      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">No.</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">ICS</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Part Name</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Supplier</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Maker</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Price</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">PO#</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">ETD</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">ETA</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Qty</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">In Transit</th>
              {editable && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {records.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2">{r.no}</td>
                <td className="px-3 py-2">{r.ics}</td>
                <td className="px-3 py-2">{r.partName}</td>
                <td className="px-3 py-2">{r.supplier}</td>
                <td className="px-3 py-2">{r.maker}</td>
                <td className="px-3 py-2">{r.price}</td>
                <td className="px-3 py-2">{r.poNumber}</td>
                <td className="px-3 py-2">{r.etd?.toISOString().slice(0, 10)}</td>
                <td className="px-3 py-2">{r.eta?.toISOString().slice(0, 10)}</td>
                <td className="px-3 py-2">{r.qty}</td>
                <td className="px-3 py-2">{r.inTransit}</td>
                {editable && (
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <Link
                      href={`/receiving-report/${r.id}/edit`}
                      className="mr-3 text-sm font-medium text-gray-700 hover:text-gray-900"
                    >
                      Edit
                    </Link>
                    <DeleteButton action={deleteReceivingRecord.bind(null, r.id)} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
