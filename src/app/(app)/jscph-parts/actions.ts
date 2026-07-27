"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/authz";
import { parseDateInput, parseNumberInput, parseTextInput, requireWholeNumber } from "@/lib/format";
import { logActivity, diffFields } from "@/lib/activity";
import { notifyNegativeStock, crossedIntoNegative } from "@/lib/discord";

const PART_FIELDS = [
  "code",
  "classification",
  "partName",
  "modelName",
  "spq",
  "unitPricePurchase",
  "unitPriceSales",
];
const PO_PRICE_FIELDS = ["poNumber", "qty"];
const FORECAST_FIELDS = ["month", "usageQty"];
const DELIVERY_FIELDS = ["date", "qty"];
const BUFFER_FIELDS = ["month", "bufferQty"];
const ADJUSTMENT_FIELDS = ["boh", "incomingA", "incomingB"];

function readPartForm(formData: FormData) {
  return {
    code: String(formData.get("code") ?? "").trim(),
    classification: parseTextInput(formData.get("classification")),
    partName: parseTextInput(formData.get("partName")),
    modelName: parseTextInput(formData.get("modelName")),
    spq: requireWholeNumber(parseNumberInput(formData.get("spq")), "SPQ"),
    unitPricePurchase: parseNumberInput(formData.get("unitPricePurchase")),
    unitPriceSales: parseNumberInput(formData.get("unitPriceSales")),
  };
}

function parseMonthInput(value: FormDataEntryValue | null): Date | null {
  const str = typeof value === "string" ? value.trim() : "";
  if (!str) return null;
  const date = new Date(`${str}-01T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function partCode(partId: string): Promise<string> {
  const part = await prisma.jscphPart.findUnique({ where: { id: partId }, select: { code: true } });
  return part?.code ?? partId;
}

export async function createJscphPart(formData: FormData) {
  await requireEditor();
  const data = readPartForm(formData);
  if (!data.code) {
    throw new Error("Code is required");
  }
  await prisma.jscphPart.create({ data: { ...data, code: data.code } });
  await logActivity({
    action: "CREATE",
    entityType: "JscphPart",
    entityLabel: data.code,
    changes: diffFields(null, data, PART_FIELDS),
  });
  revalidatePath("/jscph-parts");
  redirect("/jscph-parts?flash=Record created");
}

export async function updateJscphPart(id: string, formData: FormData) {
  await requireEditor();
  const data = readPartForm(formData);
  if (!data.code) {
    throw new Error("Code is required");
  }
  const before = await prisma.jscphPart.findUnique({ where: { id } });
  await prisma.jscphPart.update({
    where: { id },
    data: { ...data, code: data.code },
  });
  await logActivity({
    action: "UPDATE",
    entityType: "JscphPart",
    entityLabel: data.code,
    changes: diffFields(before, data, PART_FIELDS),
  });
  revalidatePath("/jscph-parts");
  redirect("/jscph-parts?flash=Record updated");
}

export async function deleteJscphPart(id: string) {
  await requireEditor();
  const part = await prisma.jscphPart.delete({ where: { id } });
  await logActivity({
    action: "DELETE",
    entityType: "JscphPart",
    entityLabel: part.code,
    changes: diffFields(part, null, PART_FIELDS),
  });
  revalidatePath("/jscph-parts");
}

// --- PO Price Entries ---

export async function upsertPoPriceEntry(partId: string, formData: FormData) {
  await requireEditor();
  const poNumber = String(formData.get("poNumber") ?? "").trim();
  const qty = parseNumberInput(formData.get("qty"));
  if (!poNumber) {
    throw new Error("PO # is required");
  }
  const [code, before] = await Promise.all([
    partCode(partId),
    prisma.poPriceEntry.findUnique({ where: { partId_poNumber: { partId, poNumber } } }),
  ]);
  const data = { poNumber, qty };
  await prisma.poPriceEntry.upsert({
    where: { partId_poNumber: { partId, poNumber } },
    create: { partId, ...data },
    update: { qty },
  });
  await logActivity({
    action: before ? "UPDATE" : "CREATE",
    entityType: "PoPriceEntry",
    entityLabel: `${code} — ${poNumber}`,
    changes: diffFields(before, data, PO_PRICE_FIELDS),
  });
  revalidatePath(`/jscph-parts/${partId}`);
}

export async function deletePoPriceEntry(id: string) {
  await requireEditor();
  const entry = await prisma.poPriceEntry.delete({ where: { id } });
  const code = await partCode(entry.partId);
  await logActivity({
    action: "DELETE",
    entityType: "PoPriceEntry",
    entityLabel: `${code} — ${entry.poNumber}`,
    changes: diffFields(entry, null, PO_PRICE_FIELDS),
  });
  revalidatePath(`/jscph-parts/${entry.partId}`);
}

// --- Monthly Forecast Usage ---

export async function upsertMonthlyForecastUsage(partId: string, formData: FormData) {
  await requireEditor();
  const month = parseMonthInput(formData.get("month"));
  const usageQty = parseNumberInput(formData.get("usageQty"));
  if (!month) {
    throw new Error("Month is required");
  }
  const [code, before] = await Promise.all([
    partCode(partId),
    prisma.monthlyForecastUsage.findUnique({ where: { partId_month: { partId, month } } }),
  ]);
  const data = { month, usageQty };
  await prisma.monthlyForecastUsage.upsert({
    where: { partId_month: { partId, month } },
    create: { partId, ...data },
    update: { usageQty },
  });
  await logActivity({
    action: before ? "UPDATE" : "CREATE",
    entityType: "MonthlyForecastUsage",
    entityLabel: `${code} — ${month.toISOString().slice(0, 7)}`,
    changes: diffFields(before, data, FORECAST_FIELDS),
  });
  revalidatePath(`/jscph-parts/${partId}`);
}

export async function deleteMonthlyForecastUsage(id: string) {
  await requireEditor();
  const entry = await prisma.monthlyForecastUsage.delete({ where: { id } });
  const code = await partCode(entry.partId);
  await logActivity({
    action: "DELETE",
    entityType: "MonthlyForecastUsage",
    entityLabel: `${code} — ${entry.month.toISOString().slice(0, 7)}`,
    changes: diffFields(entry, null, FORECAST_FIELDS),
  });
  revalidatePath(`/jscph-parts/${entry.partId}`);
}

// --- Daily Delivery Quantities ---

export async function upsertDailyDeliveryQty(partId: string, formData: FormData) {
  await requireEditor();
  const date = parseDateInput(formData.get("date"));
  const qty = parseNumberInput(formData.get("qty"));
  if (!date) {
    throw new Error("Date is required");
  }
  const [code, before, part] = await Promise.all([
    partCode(partId),
    prisma.dailyDeliveryQty.findUnique({ where: { partId_date: { partId, date } } }),
    prisma.jscphPart.findUnique({ where: { id: partId }, select: { spq: true } }),
  ]);
  if (part?.spq && qty % part.spq !== 0) {
    throw new Error(
      `Delivery qty (${qty}) does not divide evenly into whole boxes of SPQ ${part.spq} (${(qty / part.spq).toFixed(2)} boxes) — SPQ Check requires a whole number of boxes.`,
    );
  }
  const data = { date, qty };
  await prisma.dailyDeliveryQty.upsert({
    where: { partId_date: { partId, date } },
    create: { partId, ...data },
    update: { qty },
  });
  await logActivity({
    action: before ? "UPDATE" : "CREATE",
    entityType: "DailyDeliveryQty",
    entityLabel: `${code} — ${date.toISOString().slice(0, 10)}`,
    changes: diffFields(before, data, DELIVERY_FIELDS),
  });
  revalidatePath(`/jscph-parts/${partId}`);
}

export async function deleteDailyDeliveryQty(id: string) {
  await requireEditor();
  const entry = await prisma.dailyDeliveryQty.delete({ where: { id } });
  const code = await partCode(entry.partId);
  await logActivity({
    action: "DELETE",
    entityType: "DailyDeliveryQty",
    entityLabel: `${code} — ${entry.date.toISOString().slice(0, 10)}`,
    changes: diffFields(entry, null, DELIVERY_FIELDS),
  });
  revalidatePath(`/jscph-parts/${entry.partId}`);
}

// --- Monthly Buffer Overrides ---

export async function upsertMonthlyBufferOverride(partId: string, formData: FormData) {
  await requireEditor();
  const month = parseMonthInput(formData.get("month"));
  const bufferQty = parseNumberInput(formData.get("bufferQty"));
  if (!month) {
    throw new Error("Month is required");
  }
  const [code, before] = await Promise.all([
    partCode(partId),
    prisma.monthlyBufferOverride.findUnique({ where: { partId_month: { partId, month } } }),
  ]);
  const data = { month, bufferQty };
  await prisma.monthlyBufferOverride.upsert({
    where: { partId_month: { partId, month } },
    create: { partId, ...data },
    update: { bufferQty },
  });
  await logActivity({
    action: before ? "UPDATE" : "CREATE",
    entityType: "MonthlyBufferOverride",
    entityLabel: `${code} — ${month.toISOString().slice(0, 7)}`,
    changes: diffFields(before, data, BUFFER_FIELDS),
  });
  revalidatePath(`/jscph-parts/${partId}`);
}

export async function deleteMonthlyBufferOverride(id: string) {
  await requireEditor();
  const entry = await prisma.monthlyBufferOverride.delete({ where: { id } });
  const code = await partCode(entry.partId);
  await logActivity({
    action: "DELETE",
    entityType: "MonthlyBufferOverride",
    entityLabel: `${code} — ${entry.month.toISOString().slice(0, 7)}`,
    changes: diffFields(entry, null, BUFFER_FIELDS),
  });
  revalidatePath(`/jscph-parts/${entry.partId}`);
}

// --- Delivery Adjustment (1:1) ---

export async function upsertDeliveryAdjustment(partId: string, formData: FormData) {
  await requireEditor();
  const boh = parseNumberInput(formData.get("boh"));
  const incomingA = parseNumberInput(formData.get("incomingA"));
  const incomingB = parseNumberInput(formData.get("incomingB"));
  const [code, before] = await Promise.all([
    partCode(partId),
    prisma.deliveryAdjustment.findUnique({ where: { partId } }),
  ]);
  const data = { boh, incomingA, incomingB };
  await prisma.deliveryAdjustment.upsert({
    where: { partId },
    create: { partId, ...data },
    update: data,
  });
  await logActivity({
    action: before ? "UPDATE" : "CREATE",
    entityType: "DeliveryAdjustment",
    entityLabel: code,
    changes: diffFields(before, data, ADJUSTMENT_FIELDS),
  });
  if (crossedIntoNegative(before?.boh, boh)) {
    await notifyNegativeStock({ system: "JSCPH", partLabel: code, field: "BOH", qty: boh! });
  }
  revalidatePath(`/jscph-parts/${partId}`);
}
