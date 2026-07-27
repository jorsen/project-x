"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/authz";
import { parseDateInput, parseIntInput, parseNumberInput, parseTextInput } from "@/lib/format";
import { logActivity, diffFields } from "@/lib/activity";

const FIELDS = [
  "no",
  "ics",
  "partName",
  "supplier",
  "maker",
  "commodity",
  "price",
  "poNumber",
  "etd",
  "eta",
  "qty",
  "inTransit",
  "remarks",
];

function readForm(formData: FormData) {
  return {
    no: parseIntInput(formData.get("no")),
    ics: String(formData.get("ics") ?? "").trim(),
    partName: parseTextInput(formData.get("partName")),
    supplier: parseTextInput(formData.get("supplier")),
    maker: parseTextInput(formData.get("maker")),
    commodity: parseTextInput(formData.get("commodity")),
    price: parseNumberInput(formData.get("price")),
    poNumber: parseTextInput(formData.get("poNumber")),
    etd: parseDateInput(formData.get("etd")),
    eta: parseDateInput(formData.get("eta")),
    qty: parseNumberInput(formData.get("qty")),
    inTransit: parseNumberInput(formData.get("inTransit")),
    remarks: parseTextInput(formData.get("remarks")),
  };
}

export async function createReceivingRecord(formData: FormData) {
  await requireEditor();
  const data = readForm(formData);
  if (data.no === null || !data.ics) {
    throw new Error("No. and ICS are required");
  }
  await prisma.receivingRecord.create({ data: { ...data, no: data.no, ics: data.ics } });
  await logActivity({
    action: "CREATE",
    entityType: "ReceivingRecord",
    entityLabel: data.ics,
    changes: diffFields(null, data, FIELDS),
  });
  revalidatePath("/receiving-report");
  redirect("/receiving-report?flash=Record created");
}

export async function updateReceivingRecord(id: string, formData: FormData) {
  await requireEditor();
  const data = readForm(formData);
  if (data.no === null || !data.ics) {
    throw new Error("No. and ICS are required");
  }
  const before = await prisma.receivingRecord.findUnique({ where: { id } });
  await prisma.receivingRecord.update({
    where: { id },
    data: { ...data, no: data.no, ics: data.ics },
  });
  await logActivity({
    action: "UPDATE",
    entityType: "ReceivingRecord",
    entityLabel: data.ics,
    changes: diffFields(before, data, FIELDS),
  });
  revalidatePath("/receiving-report");
  redirect("/receiving-report?flash=Record updated");
}

export async function deleteReceivingRecord(id: string) {
  await requireEditor();
  const record = await prisma.receivingRecord.delete({ where: { id } });
  await logActivity({
    action: "DELETE",
    entityType: "ReceivingRecord",
    entityLabel: record.ics,
    changes: diffFields(record, null, FIELDS),
  });
  revalidatePath("/receiving-report");
}
