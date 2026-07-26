"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/authz";
import { parseDateInput, parseIntInput, parseNumberInput, parseTextInput } from "@/lib/format";

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
  revalidatePath("/receiving-report");
  redirect("/receiving-report?flash=Record created");
}

export async function updateReceivingRecord(id: string, formData: FormData) {
  await requireEditor();
  const data = readForm(formData);
  if (data.no === null || !data.ics) {
    throw new Error("No. and ICS are required");
  }
  await prisma.receivingRecord.update({
    where: { id },
    data: { ...data, no: data.no, ics: data.ics },
  });
  revalidatePath("/receiving-report");
  redirect("/receiving-report?flash=Record updated");
}

export async function deleteReceivingRecord(id: string) {
  await requireEditor();
  await prisma.receivingRecord.delete({ where: { id } });
  revalidatePath("/receiving-report");
}
