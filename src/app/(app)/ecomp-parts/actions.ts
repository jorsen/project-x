"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/authz";
import { parseDateInput, parseNumberInput, parseTextInput } from "@/lib/format";

function readForm(formData: FormData) {
  return {
    no: parseTextInput(formData.get("no")),
    partNumber: parseTextInput(formData.get("partNumber")),
    category: parseTextInput(formData.get("category")),
    ics: String(formData.get("ics") ?? "").trim(),
    maker: parseTextInput(formData.get("maker")),
    inventoryQty: parseNumberInput(formData.get("inventoryQty")),
    inventoryAsOf: parseDateInput(formData.get("inventoryAsOf")),
  };
}

export async function createEcompPart(formData: FormData) {
  await requireEditor();
  const data = readForm(formData);
  if (!data.ics) {
    throw new Error("ICS is required");
  }
  await prisma.ecompPart.create({ data: { ...data, ics: data.ics } });
  revalidatePath("/ecomp-parts");
  redirect("/ecomp-parts?flash=Record created");
}

export async function updateEcompPart(id: string, formData: FormData) {
  await requireEditor();
  const data = readForm(formData);
  if (!data.ics) {
    throw new Error("ICS is required");
  }
  await prisma.ecompPart.update({
    where: { id },
    data: { ...data, ics: data.ics },
  });
  revalidatePath("/ecomp-parts");
  redirect("/ecomp-parts?flash=Record updated");
}

export async function deleteEcompPart(id: string) {
  await requireEditor();
  await prisma.ecompPart.delete({ where: { id } });
  revalidatePath("/ecomp-parts");
}

export async function upsertCustomerDemand(partId: string, formData: FormData) {
  await requireEditor();
  const customerCode = String(formData.get("customerCode") ?? "").trim();
  const qty = parseNumberInput(formData.get("qty"));
  if (!customerCode) {
    throw new Error("Customer code is required");
  }
  await prisma.ecompCustomerDemand.upsert({
    where: { partId_customerCode: { partId, customerCode } },
    create: { partId, customerCode, qty },
    update: { qty },
  });
  revalidatePath(`/ecomp-parts/${partId}`);
}

export async function deleteCustomerDemand(id: string) {
  await requireEditor();
  const demand = await prisma.ecompCustomerDemand.delete({ where: { id } });
  revalidatePath(`/ecomp-parts/${demand.partId}`);
}
