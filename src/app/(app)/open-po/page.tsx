import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/authz";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { deleteOpenPoLine } from "./actions";

const TABS = [
  { label: "All", value: undefined },
  { label: "Supplier", value: "SUPPLIER" },
  { label: "Amount", value: "AMOUNT" },
] as const;

function tabHref(q: string | undefined, source: string | undefined) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (source) params.set("source", source);
  const qs = params.toString();
  return qs ? `/open-po?${qs}` : "/open-po";
}

export default async function OpenPoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string }>;
}) {
  const { q, source } = await searchParams;
  const session = await auth();
  const editable = canEdit(session?.user?.role);

  const sourceSheet = source === "SUPPLIER" || source === "AMOUNT" ? source : undefined;

  const records = await prisma.openPoLine.findMany({
    where: {
      ...(sourceSheet ? { sourceSheet } : {}),
      ...(q
        ? {
            OR: [
              { ics: { contains: q, mode: "insensitive" } },
              { partNumber: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
              { maker: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ ics: "asc" }, { sourceSheet: "asc" }],
    take: 200,
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Open PO</h1>
          <p className="text-sm text-gray-500">{records.length} record(s) shown (max 200)</p>
        </div>
        {editable && (
          <Link
            href="/open-po/new"
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            New record
          </Link>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        {TABS.map((tab) => {
          const active = sourceSheet === tab.value;
          return (
            <Link
              key={tab.label}
              href={tabHref(q, tab.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                active
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <form className="mb-4">
        {sourceSheet && <input type="hidden" name="source" value={sourceSheet} />}
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
              <th className="px-3 py-2 text-left font-medium text-gray-500">Source Sheet</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">No.</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Part Number</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Category</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">ICS</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Maker</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Unit Price</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {records.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2">{r.sourceSheet}</td>
                <td className="px-3 py-2">{r.no}</td>
                <td className="px-3 py-2">{r.partNumber}</td>
                <td className="px-3 py-2">{r.category}</td>
                <td className="px-3 py-2">{r.ics}</td>
                <td className="px-3 py-2">{r.maker}</td>
                <td className="px-3 py-2">{r.unitPrice}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <Link
                    href={`/open-po/${r.id}`}
                    className="mr-3 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    View
                  </Link>
                  {editable && (
                    <>
                      <Link
                        href={`/open-po/${r.id}/edit`}
                        className="mr-3 text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        Edit
                      </Link>
                      <DeleteButton action={deleteOpenPoLine.bind(null, r.id)} />
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
