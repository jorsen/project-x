"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/authz";
import { parseDateInput, parseNumberInput, parseTextInput } from "@/lib/format";

function readPartForm(formData: FormData) {
  return {
    code: String(formData.get("code") ?? "").trim(),
    ics1: parseTextInput(formData.get("ics1")),
    partName: parseTextInput(formData.get("partName")),
    modelName: parseTextInput(formData.get("modelName")),
    spq: parseNumberInput(formData.get("spq")),
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

export async function createJscphPart(formData: FormData) {
  await requireEditor();
  const data = readPartForm(formData);
  if (!data.code) {
    throw new Error("Code is required");
  }
  await prisma.jscphPart.create({ data: { ...data, code: data.code } });
  revalidatePath("/jscph-parts");
  redirect("/jscph-parts?flash=Record created");
}

export async function updateJscphPart(id: string, formData: FormData) {
  await requireEditor();
  const data = readPartForm(formData);
  if (!data.code) {
    throw new Error("Code is required");
  }
  await prisma.jscphPart.update({
    where: { id },
    data: { ...data, code: data.code },
  });
  revalidatePath("/jscph-parts");
  redirect("/jscph-parts?flash=Record updated");
}

export async function deleteJscphPart(id: string) {
  await requireEditor();
  await prisma.jscphPart.delete({ where: { id } });
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
  await prisma.poPriceEntry.upsert({
    where: { partId_poNumber: { partId, poNumber } },
    create: { partId, poNumber, qty },
    update: { qty },
  });
  revalidatePath(`/jscph-parts/${partId}`);
}

export async function deletePoPriceEntry(id: string) {
  await requireEditor();
  const entry = await prisma.poPriceEntry.delete({ where: { id } });
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
  await prisma.monthlyForecastUsage.upsert({
    where: { partId_month: { partId, month } },
    create: { partId, month, usageQty },
    update: { usageQty },
  });
  revalidatePath(`/jscph-parts/${partId}`);
}

export async function deleteMonthlyForecastUsage(id: string) {
  await requireEditor();
  const entry = await prisma.monthlyForecastUsage.delete({ where: { id } });
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
  await prisma.dailyDeliveryQty.upsert({
    where: { partId_date: { partId, date } },
    create: { partId, date, qty },
    update: { qty },
  });
  revalidatePath(`/jscph-parts/${partId}`);
}

export async function deleteDailyDeliveryQty(id: string) {
  await requireEditor();
  const entry = await prisma.dailyDeliveryQty.delete({ where: { id } });
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
  await prisma.monthlyBufferOverride.upsert({
    where: { partId_month: { partId, month } },
    create: { partId, month, bufferQty },
    update: { bufferQty },
  });
  revalidatePath(`/jscph-parts/${partId}`);
}

export async function deleteMonthlyBufferOverride(id: string) {
  await requireEditor();
  const entry = await prisma.monthlyBufferOverride.delete({ where: { id } });
  revalidatePath(`/jscph-parts/${entry.partId}`);
}

// --- Delivery Adjustment (1:1) ---

export async function upsertDeliveryAdjustment(partId: string, formData: FormData) {
  await requireEditor();
  const boh = parseNumberInput(formData.get("boh"));
  const incomingA = parseNumberInput(formData.get("incomingA"));
  const incomingB = parseNumberInput(formData.get("incomingB"));
  await prisma.deliveryAdjustment.upsert({
    where: { partId },
    create: { partId, boh, incomingA, incomingB },
    update: { boh, incomingA, incomingB },
  });
  revalidatePath(`/jscph-parts/${partId}`);
}
