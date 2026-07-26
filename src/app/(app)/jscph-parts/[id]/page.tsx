import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/authz";
import { DeleteButton } from "@/components/ui/DeleteButton";
import {
  deleteDailyDeliveryQty,
  deleteMonthlyBufferOverride,
  deleteMonthlyForecastUsage,
  deletePoPriceEntry,
  upsertDailyDeliveryQty,
  upsertDeliveryAdjustment,
  upsertMonthlyBufferOverride,
  upsertMonthlyForecastUsage,
  upsertPoPriceEntry,
} from "../actions";

function monthValue(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function dateValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function JscphPartDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const editable = canEdit(session?.user?.role);

  const part = await prisma.jscphPart.findUnique({
    where: { id },
    include: {
      poPriceEntries: { orderBy: { poNumber: "asc" } },
      monthlyForecastUsages: { orderBy: { month: "asc" } },
      dailyDeliveryQtys: { orderBy: { date: "asc" } },
      monthlyBufferOverrides: { orderBy: { month: "asc" } },
      deliveryAdjustment: true,
    },
  });
  if (!part) notFound();

  const upsertPoPriceEntryWithId = upsertPoPriceEntry.bind(null, part.id);
  const upsertMonthlyForecastUsageWithId = upsertMonthlyForecastUsage.bind(null, part.id);
  const upsertDailyDeliveryQtyWithId = upsertDailyDeliveryQty.bind(null, part.id);
  const upsertMonthlyBufferOverrideWithId = upsertMonthlyBufferOverride.bind(null, part.id);
  const upsertDeliveryAdjustmentWithId = upsertDeliveryAdjustment.bind(null, part.id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{part.code}</h1>
          <p className="text-sm text-gray-500">JSCPH Part detail</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/jscph-parts"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Back to list
          </Link>
          {editable && (
            <Link
              href={`/jscph-parts/${part.id}/edit`}
              className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-md border border-gray-200 bg-white p-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-gray-500">Code</dt>
            <dd className="font-medium text-gray-900">{part.code}</dd>
          </div>
          <div>
            <dt className="text-gray-500">ICS1</dt>
            <dd className="font-medium text-gray-900">{part.ics1 ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Part Name</dt>
            <dd className="font-medium text-gray-900">{part.partName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Model Name</dt>
            <dd className="font-medium text-gray-900">{part.modelName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">SPQ</dt>
            <dd className="font-medium text-gray-900">{part.spq ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Unit Price Purchase</dt>
            <dd className="font-medium text-gray-900">{part.unitPricePurchase ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Unit Price Sales</dt>
            <dd className="font-medium text-gray-900">{part.unitPriceSales ?? "—"}</dd>
          </div>
        </dl>
      </div>

      {/* PO Price Entries */}
      <section>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">PO Price Entries</h2>
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">PO #</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Qty</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Updated</th>
                {editable && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {part.poPriceEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-3 py-2">{entry.poNumber}</td>
                  <td className="px-3 py-2">{entry.qty}</td>
                  <td className="px-3 py-2">{dateValue(entry.updatedAt)}</td>
                  {editable && (
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <DeleteButton action={deletePoPriceEntry.bind(null, entry.id)} />
                    </td>
                  )}
                </tr>
              ))}
              {part.poPriceEntries.length === 0 && (
                <tr>
                  <td colSpan={editable ? 4 : 3} className="px-3 py-2 text-gray-500">
                    No PO price entries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {editable && (
          <form
            action={upsertPoPriceEntryWithId}
            className="mt-3 flex flex-wrap items-end gap-3"
          >
            <div className="space-y-1">
              <label htmlFor="poNumber" className="block text-sm font-medium text-gray-700">
                PO #
              </label>
              <input
                id="poNumber"
                name="poNumber"
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
              Save
            </button>
          </form>
        )}
      </section>

      {/* Monthly Forecast Usage */}
      <section>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Monthly Forecast Usage</h2>
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Month</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Usage Qty</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Updated</th>
                {editable && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {part.monthlyForecastUsages.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-3 py-2">{monthValue(entry.month)}</td>
                  <td className="px-3 py-2">{entry.usageQty}</td>
                  <td className="px-3 py-2">{dateValue(entry.updatedAt)}</td>
                  {editable && (
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <DeleteButton action={deleteMonthlyForecastUsage.bind(null, entry.id)} />
                    </td>
                  )}
                </tr>
              ))}
              {part.monthlyForecastUsages.length === 0 && (
                <tr>
                  <td colSpan={editable ? 4 : 3} className="px-3 py-2 text-gray-500">
                    No monthly forecast usage entries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {editable && (
          <form
            action={upsertMonthlyForecastUsageWithId}
            className="mt-3 flex flex-wrap items-end gap-3"
          >
            <div className="space-y-1">
              <label htmlFor="month" className="block text-sm font-medium text-gray-700">
                Month
              </label>
              <input
                id="month"
                name="month"
                type="month"
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="usageQty" className="block text-sm font-medium text-gray-700">
                Usage Qty
              </label>
              <input
                id="usageQty"
                name="usageQty"
                type="number"
                step="any"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Save
            </button>
          </form>
        )}
      </section>

      {/* Daily Delivery Quantities */}
      <section>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Daily Delivery Quantities</h2>
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Qty</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Updated</th>
                {editable && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {part.dailyDeliveryQtys.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-3 py-2">{dateValue(entry.date)}</td>
                  <td className="px-3 py-2">{entry.qty}</td>
                  <td className="px-3 py-2">{dateValue(entry.updatedAt)}</td>
                  {editable && (
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <DeleteButton action={deleteDailyDeliveryQty.bind(null, entry.id)} />
                    </td>
                  )}
                </tr>
              ))}
              {part.dailyDeliveryQtys.length === 0 && (
                <tr>
                  <td colSpan={editable ? 4 : 3} className="px-3 py-2 text-gray-500">
                    No daily delivery quantities.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {editable && (
          <form
            action={upsertDailyDeliveryQtyWithId}
            className="mt-3 flex flex-wrap items-end gap-3"
          >
            <div className="space-y-1">
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                id="date"
                name="date"
                type="date"
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="dailyQty" className="block text-sm font-medium text-gray-700">
                Qty
              </label>
              <input
                id="dailyQty"
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
              Save
            </button>
          </form>
        )}
      </section>

      {/* Monthly Buffer Overrides */}
      <section>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Monthly Buffer Overrides</h2>
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Month</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Buffer Qty</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Updated</th>
                {editable && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {part.monthlyBufferOverrides.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-3 py-2">{monthValue(entry.month)}</td>
                  <td className="px-3 py-2">{entry.bufferQty}</td>
                  <td className="px-3 py-2">{dateValue(entry.updatedAt)}</td>
                  {editable && (
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <DeleteButton action={deleteMonthlyBufferOverride.bind(null, entry.id)} />
                    </td>
                  )}
                </tr>
              ))}
              {part.monthlyBufferOverrides.length === 0 && (
                <tr>
                  <td colSpan={editable ? 4 : 3} className="px-3 py-2 text-gray-500">
                    No monthly buffer overrides.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {editable && (
          <form
            action={upsertMonthlyBufferOverrideWithId}
            className="mt-3 flex flex-wrap items-end gap-3"
          >
            <div className="space-y-1">
              <label htmlFor="bufferMonth" className="block text-sm font-medium text-gray-700">
                Month
              </label>
              <input
                id="bufferMonth"
                name="month"
                type="month"
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="bufferQty" className="block text-sm font-medium text-gray-700">
                Buffer Qty
              </label>
              <input
                id="bufferQty"
                name="bufferQty"
                type="number"
                step="any"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Save
            </button>
          </form>
        )}
      </section>

      {/* Delivery Adjustment (1:1) */}
      <section>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Delivery Adjustment</h2>
        {editable ? (
          <form
            action={upsertDeliveryAdjustmentWithId}
            className="max-w-xl space-y-4 rounded-md border border-gray-200 bg-white p-4"
          >
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor="boh" className="block text-sm font-medium text-gray-700">
                  BOH
                </label>
                <input
                  id="boh"
                  name="boh"
                  type="number"
                  step="any"
                  defaultValue={part.deliveryAdjustment?.boh ?? ""}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="incomingA" className="block text-sm font-medium text-gray-700">
                  Incoming A
                </label>
                <input
                  id="incomingA"
                  name="incomingA"
                  type="number"
                  step="any"
                  defaultValue={part.deliveryAdjustment?.incomingA ?? ""}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="incomingB" className="block text-sm font-medium text-gray-700">
                  Incoming B
                </label>
                <input
                  id="incomingB"
                  name="incomingB"
                  type="number"
                  step="any"
                  defaultValue={part.deliveryAdjustment?.incomingB ?? ""}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Save
            </button>
          </form>
        ) : (
          <div className="max-w-xl rounded-md border border-gray-200 bg-white p-4">
            <dl className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">BOH</dt>
                <dd className="font-medium text-gray-900">
                  {part.deliveryAdjustment?.boh ?? "not set"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Incoming A</dt>
                <dd className="font-medium text-gray-900">
                  {part.deliveryAdjustment?.incomingA ?? "not set"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Incoming B</dt>
                <dd className="font-medium text-gray-900">
                  {part.deliveryAdjustment?.incomingB ?? "not set"}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </section>
    </div>
  );
}
