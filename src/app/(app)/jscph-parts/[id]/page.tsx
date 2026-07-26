import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/authz";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, LinkButton } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import * as t from "@/components/ui/table";
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

function SectionCard({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          {count}
        </span>
      </div>
      {children}
    </div>
  );
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
    <div>
      <PageHeader
        title={part.code}
        description="JSCPH Part detail"
        actions={
          <>
            <LinkButton href="/jscph-parts" variant="secondary">
              Back to list
            </LinkButton>
            {editable && <LinkButton href={`/jscph-parts/${part.id}/edit`}>Edit</LinkButton>}
          </>
        }
      />

      <div className="space-y-6">
        {/* Core fields summary */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs font-medium text-slate-500">Code</dt>
              <dd className="mt-0.5 text-sm text-slate-900">{part.code}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">ICS1</dt>
              <dd className="mt-0.5 text-sm text-slate-900">
                {part.ics1 ?? <span className="text-slate-300">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Part Name</dt>
              <dd className="mt-0.5 text-sm text-slate-900">
                {part.partName ?? <span className="text-slate-300">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Model Name</dt>
              <dd className="mt-0.5 text-sm text-slate-900">
                {part.modelName ?? <span className="text-slate-300">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">SPQ</dt>
              <dd className="mt-0.5 text-sm text-slate-900">
                {part.spq ?? <span className="text-slate-300">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Unit Price Purchase</dt>
              <dd className="mt-0.5 text-sm text-slate-900">
                {part.unitPricePurchase ?? <span className="text-slate-300">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Unit Price Sales</dt>
              <dd className="mt-0.5 text-sm text-slate-900">
                {part.unitPriceSales ?? <span className="text-slate-300">—</span>}
              </dd>
            </div>
          </dl>
        </div>

        {/* PO Price Entries */}
        <SectionCard title="PO Price Entries" count={part.poPriceEntries.length}>
          <div className="overflow-x-auto">
            <table className={t.table}>
              <thead className={t.thead}>
                <tr>
                  <th className={t.th}>PO #</th>
                  <th className={t.thNum}>Qty</th>
                  <th className={t.th}>Updated</th>
                  {editable && <th className={t.th} />}
                </tr>
              </thead>
              <tbody className={t.tbody}>
                {part.poPriceEntries.map((entry) => (
                  <tr key={entry.id} className={t.tr}>
                    <td className={`${t.td} font-medium text-slate-900`}>{entry.poNumber}</td>
                    <td className={t.tdNum}>
                      {entry.qty ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className={t.tdMuted}>{dateValue(entry.updatedAt)}</td>
                    {editable && (
                      <td className={t.tdActions}>
                        <DeleteButton action={deletePoPriceEntry.bind(null, entry.id)} />
                      </td>
                    )}
                  </tr>
                ))}
                {part.poPriceEntries.length === 0 && (
                  <tr>
                    <td colSpan={editable ? 4 : 3} className={t.tdMuted}>
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
              className="flex flex-wrap items-end gap-3 border-t border-slate-100 p-4"
            >
              <div className="w-40">
                <Field name="poNumber" label="PO #" required />
              </div>
              <div className="w-32">
                <Field name="qty" label="Qty" type="number" step="any" />
              </div>
              <Button type="submit" size="sm">
                Save
              </Button>
            </form>
          )}
        </SectionCard>

        {/* Monthly Forecast Usage */}
        <SectionCard title="Monthly Forecast Usage" count={part.monthlyForecastUsages.length}>
          <div className="overflow-x-auto">
            <table className={t.table}>
              <thead className={t.thead}>
                <tr>
                  <th className={t.th}>Month</th>
                  <th className={t.thNum}>Usage Qty</th>
                  <th className={t.th}>Updated</th>
                  {editable && <th className={t.th} />}
                </tr>
              </thead>
              <tbody className={t.tbody}>
                {part.monthlyForecastUsages.map((entry) => (
                  <tr key={entry.id} className={t.tr}>
                    <td className={`${t.td} font-medium text-slate-900`}>
                      {monthValue(entry.month)}
                    </td>
                    <td className={t.tdNum}>
                      {entry.usageQty ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className={t.tdMuted}>{dateValue(entry.updatedAt)}</td>
                    {editable && (
                      <td className={t.tdActions}>
                        <DeleteButton action={deleteMonthlyForecastUsage.bind(null, entry.id)} />
                      </td>
                    )}
                  </tr>
                ))}
                {part.monthlyForecastUsages.length === 0 && (
                  <tr>
                    <td colSpan={editable ? 4 : 3} className={t.tdMuted}>
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
              className="flex flex-wrap items-end gap-3 border-t border-slate-100 p-4"
            >
              <div className="w-40">
                <Field name="month" label="Month" type="month" required />
              </div>
              <div className="w-32">
                <Field name="usageQty" label="Usage Qty" type="number" step="any" />
              </div>
              <Button type="submit" size="sm">
                Save
              </Button>
            </form>
          )}
        </SectionCard>

        {/* Daily Delivery Quantities */}
        <SectionCard title="Daily Delivery Quantities" count={part.dailyDeliveryQtys.length}>
          <div className="overflow-x-auto">
            <table className={t.table}>
              <thead className={t.thead}>
                <tr>
                  <th className={t.th}>Date</th>
                  <th className={t.thNum}>Qty</th>
                  <th className={t.th}>Updated</th>
                  {editable && <th className={t.th} />}
                </tr>
              </thead>
              <tbody className={t.tbody}>
                {part.dailyDeliveryQtys.map((entry) => (
                  <tr key={entry.id} className={t.tr}>
                    <td className={`${t.td} font-medium text-slate-900`}>
                      {dateValue(entry.date)}
                    </td>
                    <td className={t.tdNum}>
                      {entry.qty ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className={t.tdMuted}>{dateValue(entry.updatedAt)}</td>
                    {editable && (
                      <td className={t.tdActions}>
                        <DeleteButton action={deleteDailyDeliveryQty.bind(null, entry.id)} />
                      </td>
                    )}
                  </tr>
                ))}
                {part.dailyDeliveryQtys.length === 0 && (
                  <tr>
                    <td colSpan={editable ? 4 : 3} className={t.tdMuted}>
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
              className="flex flex-wrap items-end gap-3 border-t border-slate-100 p-4"
            >
              <div className="w-40">
                <Field name="date" label="Date" type="date" required />
              </div>
              <div className="w-32">
                <Field name="qty" label="Qty" type="number" step="any" />
              </div>
              <Button type="submit" size="sm">
                Save
              </Button>
            </form>
          )}
        </SectionCard>

        {/* Monthly Buffer Overrides */}
        <SectionCard title="Monthly Buffer Overrides" count={part.monthlyBufferOverrides.length}>
          <div className="overflow-x-auto">
            <table className={t.table}>
              <thead className={t.thead}>
                <tr>
                  <th className={t.th}>Month</th>
                  <th className={t.thNum}>Buffer Qty</th>
                  <th className={t.th}>Updated</th>
                  {editable && <th className={t.th} />}
                </tr>
              </thead>
              <tbody className={t.tbody}>
                {part.monthlyBufferOverrides.map((entry) => (
                  <tr key={entry.id} className={t.tr}>
                    <td className={`${t.td} font-medium text-slate-900`}>
                      {monthValue(entry.month)}
                    </td>
                    <td className={t.tdNum}>
                      {entry.bufferQty ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className={t.tdMuted}>{dateValue(entry.updatedAt)}</td>
                    {editable && (
                      <td className={t.tdActions}>
                        <DeleteButton action={deleteMonthlyBufferOverride.bind(null, entry.id)} />
                      </td>
                    )}
                  </tr>
                ))}
                {part.monthlyBufferOverrides.length === 0 && (
                  <tr>
                    <td colSpan={editable ? 4 : 3} className={t.tdMuted}>
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
              className="flex flex-wrap items-end gap-3 border-t border-slate-100 p-4"
            >
              <div className="w-40">
                <Field name="month" label="Month" type="month" required />
              </div>
              <div className="w-32">
                <Field name="bufferQty" label="Buffer Qty" type="number" step="any" />
              </div>
              <Button type="submit" size="sm">
                Save
              </Button>
            </form>
          )}
        </SectionCard>

        {/* Delivery Adjustment (1:1) */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Delivery Adjustment</h2>
          {editable ? (
            <form action={upsertDeliveryAdjustmentWithId} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Field
                  name="boh"
                  label="BOH"
                  type="number"
                  step="any"
                  defaultValue={part.deliveryAdjustment?.boh ?? ""}
                />
                <Field
                  name="incomingA"
                  label="Incoming A"
                  type="number"
                  step="any"
                  defaultValue={part.deliveryAdjustment?.incomingA ?? ""}
                />
                <Field
                  name="incomingB"
                  label="Incoming B"
                  type="number"
                  step="any"
                  defaultValue={part.deliveryAdjustment?.incomingB ?? ""}
                />
              </div>
              <div className="border-t border-slate-100 pt-4">
                <Button type="submit" size="sm">
                  Save
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-3 gap-4">
              <div>
                <dt className="text-xs font-medium text-slate-500">BOH</dt>
                <dd className="mt-0.5 text-sm text-slate-900">
                  {part.deliveryAdjustment?.boh ?? <span className="text-slate-300">not set</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Incoming A</dt>
                <dd className="mt-0.5 text-sm text-slate-900">
                  {part.deliveryAdjustment?.incomingA ?? (
                    <span className="text-slate-300">not set</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Incoming B</dt>
                <dd className="mt-0.5 text-sm text-slate-900">
                  {part.deliveryAdjustment?.incomingB ?? (
                    <span className="text-slate-300">not set</span>
                  )}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
