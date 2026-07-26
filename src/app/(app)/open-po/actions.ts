"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/authz";
import { parseNumberInput, parseTextInput } from "@/lib/format";

function readForm(formData: FormData) {
  return {
    sourceSheet: String(formData.get("sourceSheet") ?? "").trim(),
    no: parseTextInput(formData.get("no")),
    partNumber: parseTextInput(formData.get("partNumber")),
    category: parseTextInput(formData.get("category")),
    ics: String(formData.get("ics") ?? "").trim(),
    maker: parseTextInput(formData.get("maker")),
    unitPrice: parseNumberInput(formData.get("unitPrice")),
  };
}

function validate(data: ReturnType<typeof readForm>) {
  if (data.sourceSheet !== "SUPPLIER" && data.sourceSheet !== "AMOUNT") {
    throw new Error("Source Sheet must be SUPPLIER or AMOUNT");
  }
  if (!data.ics) {
    throw new Error("ICS is required");
  }
}

export async function createOpenPoLine(formData: FormData) {
  await requireEditor();
  const data = readForm(formData);
  validate(data);
  await prisma.openPoLine.create({ data: { ...data, ics: data.ics } });
  revalidatePath("/open-po");
  redirect("/open-po");
}

export async function updateOpenPoLine(id: string, formData: FormData) {
  await requireEditor();
  const data = readForm(formData);
  validate(data);
  await prisma.openPoLine.update({
    where: { id },
    data: { ...data, ics: data.ics },
  });
  revalidatePath("/open-po");
  redirect("/open-po");
}

export async function deleteOpenPoLine(id: string) {
  await requireEditor();
  await prisma.openPoLine.delete({ where: { id } });
  revalidatePath("/open-po");
}

export async function upsertOpenPoCustomerDemand(lineId: string, formData: FormData) {
  await requireEditor();
  const customerCode = String(formData.get("customerCode") ?? "").trim();
  const qty = parseNumberInput(formData.get("qty"));
  if (!customerCode) {
    throw new Error("Customer Code is required");
  }
  await prisma.openPoCustomerDemand.upsert({
    where: { lineId_customerCode: { lineId, customerCode } },
    create: { lineId, customerCode, qty },
    update: { qty },
  });
  revalidatePath(`/open-po/${lineId}`);
}

export async function deleteOpenPoCustomerDemand(id: string) {
  await requireEditor();
  const demand = await prisma.openPoCustomerDemand.delete({ where: { id } });
  revalidatePath(`/open-po/${demand.lineId}`);
}
