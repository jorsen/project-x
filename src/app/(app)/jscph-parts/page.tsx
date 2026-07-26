import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/authz";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { deleteJscphPart } from "./actions";

export default async function JscphPartsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await auth();
  const editable = canEdit(session?.user?.role);

  const parts = await prisma.jscphPart.findMany({
    where: q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { ics1: { contains: q, mode: "insensitive" } },
            { partName: { contains: q, mode: "insensitive" } },
            { modelName: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { code: "asc" },
    take: 200,
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">JSCPH Parts</h1>
          <p className="text-sm text-gray-500">{parts.length} record(s) shown (max 200)</p>
        </div>
        {editable && (
          <Link
            href="/jscph-parts/new"
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
          placeholder="Search code, ICS1, part name, model name..."
          className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </form>

      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Code</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">ICS1</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Part Name</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Model Name</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">SPQ</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Unit Price Purchase</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Unit Price Sales</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {parts.map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-2">{p.code}</td>
                <td className="px-3 py-2">{p.ics1}</td>
                <td className="px-3 py-2">{p.partName}</td>
                <td className="px-3 py-2">{p.modelName}</td>
                <td className="px-3 py-2">{p.spq}</td>
                <td className="px-3 py-2">{p.unitPricePurchase}</td>
                <td className="px-3 py-2">{p.unitPriceSales}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <Link
                    href={`/jscph-parts/${p.id}`}
                    className="mr-3 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    View
                  </Link>
                  {editable && (
                    <>
                      <Link
                        href={`/jscph-parts/${p.id}/edit`}
                        className="mr-3 text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        Edit
                      </Link>
                      <DeleteButton action={deleteJscphPart.bind(null, p.id)} />
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
