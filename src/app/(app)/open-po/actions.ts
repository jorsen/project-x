"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/authz";
import { parseNumberInput, parseTextInput } from "@/lib/format";
import { logActivity, diffFields } from "@/lib/activity";

const FIELDS = ["sourceSheet", "no", "partNumber", "category", "ics", "maker", "unitPrice"];
const DEMAND_FIELDS = ["customerCode", "qty"];

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
  await logActivity({
    action: "CREATE",
    entityType: "OpenPoLine",
    entityLabel: `${data.sourceSheet} / ${data.ics}`,
    changes: diffFields(null, data, FIELDS),
  });
  revalidatePath("/open-po");
  redirect("/open-po?flash=Record created");
}

export async function updateOpenPoLine(id: string, formData: FormData) {
  await requireEditor();
  const data = readForm(formData);
  validate(data);
  const before = await prisma.openPoLine.findUnique({ where: { id } });
  await prisma.openPoLine.update({
    where: { id },
    data: { ...data, ics: data.ics },
  });
  await logActivity({
    action: "UPDATE",
    entityType: "OpenPoLine",
    entityLabel: `${data.sourceSheet} / ${data.ics}`,
    changes: diffFields(before, data, FIELDS),
  });
  revalidatePath("/open-po");
  redirect("/open-po?flash=Record updated");
}

export async function deleteOpenPoLine(id: string) {
  await requireEditor();
  const line = await prisma.openPoLine.delete({ where: { id } });
  await logActivity({
    action: "DELETE",
    entityType: "OpenPoLine",
    entityLabel: `${line.sourceSheet} / ${line.ics}`,
    changes: diffFields(line, null, FIELDS),
  });
  revalidatePath("/open-po");
}

export async function upsertOpenPoCustomerDemand(lineId: string, formData: FormData) {
  await requireEditor();
  const customerCode = String(formData.get("customerCode") ?? "").trim();
  const qty = parseNumberInput(formData.get("qty"));
  if (!customerCode) {
    throw new Error("Customer Code is required");
  }
  const [line, before] = await Promise.all([
    prisma.openPoLine.findUnique({ where: { id: lineId }, select: { ics: true } }),
    prisma.openPoCustomerDemand.findUnique({ where: { lineId_customerCode: { lineId, customerCode } } }),
  ]);
  const data = { customerCode, qty };
  await prisma.openPoCustomerDemand.upsert({
    where: { lineId_customerCode: { lineId, customerCode } },
    create: { lineId, ...data },
    update: { qty },
  });
  await logActivity({
    action: before ? "UPDATE" : "CREATE",
    entityType: "OpenPoCustomerDemand",
    entityLabel: `${line?.ics ?? lineId} — ${customerCode}`,
    changes: diffFields(before, data, DEMAND_FIELDS),
  });
  revalidatePath(`/open-po/${lineId}`);
}

export async function deleteOpenPoCustomerDemand(id: string) {
  await requireEditor();
  const demand = await prisma.openPoCustomerDemand.delete({
    where: { id },
    include: { line: { select: { ics: true } } },
  });
  await logActivity({
    action: "DELETE",
    entityType: "OpenPoCustomerDemand",
    entityLabel: `${demand.line.ics} — ${demand.customerCode}`,
    changes: diffFields(demand, null, DEMAND_FIELDS),
  });
  revalidatePath(`/open-po/${demand.lineId}`);
}
