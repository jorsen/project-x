import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/authz";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { deleteEcompPart } from "./actions";

export default async function EcompPartsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await auth();
  const editable = canEdit(session?.user?.role);

  const parts = await prisma.ecompPart.findMany({
    where: q
      ? {
          OR: [
            { ics: { contains: q, mode: "insensitive" } },
            { partNumber: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
            { maker: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { ics: "asc" },
    take: 200,
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Ecomp Parts</h1>
          <p className="text-sm text-gray-500">{parts.length} record(s) shown (max 200)</p>
        </div>
        {editable && (
          <Link
            href="/ecomp-parts/new"
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
          placeholder="Search ICS, part number, category, maker..."
          className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </form>

      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">No.</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Part Number</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Category</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">ICS</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Maker</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Inventory Qty</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Inventory As Of</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {parts.map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-2">{p.no}</td>
                <td className="px-3 py-2">{p.partNumber}</td>
                <td className="px-3 py-2">{p.category}</td>
                <td className="px-3 py-2">{p.ics}</td>
                <td className="px-3 py-2">{p.maker}</td>
                <td className="px-3 py-2">{p.inventoryQty}</td>
                <td className="px-3 py-2">{p.inventoryAsOf?.toISOString().slice(0, 10)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <Link
                    href={`/ecomp-parts/${p.id}`}
                    className="mr-3 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    View
                  </Link>
                  {editable && (
                    <>
                      <Link
                        href={`/ecomp-parts/${p.id}/edit`}
                        className="mr-3 text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        Edit
                      </Link>
                      <DeleteButton action={deleteEcompPart.bind(null, p.id)} />
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
