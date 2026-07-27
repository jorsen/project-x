"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/authz";
import { parseDateInput, parseNumberInput, parseTextInput } from "@/lib/format";
import { logActivity, diffFields } from "@/lib/activity";

const FIELDS = ["no", "partNumber", "category", "ics", "maker", "inventoryQty", "inventoryAsOf"];
const DEMAND_FIELDS = ["customerCode", "qty"];

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
  await logActivity({
    action: "CREATE",
    entityType: "EcompPart",
    entityLabel: data.ics,
    changes: diffFields(null, data, FIELDS),
  });
  revalidatePath("/ecomp-parts");
  redirect("/ecomp-parts?flash=Record created");
}

export async function updateEcompPart(id: string, formData: FormData) {
  await requireEditor();
  const data = readForm(formData);
  if (!data.ics) {
    throw new Error("ICS is required");
  }
  const before = await prisma.ecompPart.findUnique({ where: { id } });
  await prisma.ecompPart.update({
    where: { id },
    data: { ...data, ics: data.ics },
  });
  await logActivity({
    action: "UPDATE",
    entityType: "EcompPart",
    entityLabel: data.ics,
    changes: diffFields(before, data, FIELDS),
  });
  revalidatePath("/ecomp-parts");
  redirect("/ecomp-parts?flash=Record updated");
}

export async function deleteEcompPart(id: string) {
  await requireEditor();
  const part = await prisma.ecompPart.delete({ where: { id } });
  await logActivity({
    action: "DELETE",
    entityType: "EcompPart",
    entityLabel: part.ics,
    changes: diffFields(part, null, FIELDS),
  });
  revalidatePath("/ecomp-parts");
}

export async function upsertCustomerDemand(partId: string, formData: FormData) {
  await requireEditor();
  const customerCode = String(formData.get("customerCode") ?? "").trim();
  const qty = parseNumberInput(formData.get("qty"));
  if (!customerCode) {
    throw new Error("Customer code is required");
  }
  const [part, before] = await Promise.all([
    prisma.ecompPart.findUnique({ where: { id: partId }, select: { ics: true } }),
    prisma.ecompCustomerDemand.findUnique({ where: { partId_customerCode: { partId, customerCode } } }),
  ]);
  const data = { customerCode, qty };
  await prisma.ecompCustomerDemand.upsert({
    where: { partId_customerCode: { partId, customerCode } },
    create: { partId, ...data },
    update: { qty },
  });
  await logActivity({
    action: before ? "UPDATE" : "CREATE",
    entityType: "EcompCustomerDemand",
    entityLabel: `${part?.ics ?? partId} — ${customerCode}`,
    changes: diffFields(before, data, DEMAND_FIELDS),
  });
  revalidatePath(`/ecomp-parts/${partId}`);
}

export async function deleteCustomerDemand(id: string) {
  await requireEditor();
  const demand = await prisma.ecompCustomerDemand.delete({
    where: { id },
    include: { part: { select: { ics: true } } },
  });
  await logActivity({
    action: "DELETE",
    entityType: "EcompCustomerDemand",
    entityLabel: `${demand.part.ics} — ${demand.customerCode}`,
    changes: diffFields(demand, null, DEMAND_FIELDS),
  });
  revalidatePath(`/ecomp-parts/${demand.partId}`);
}
