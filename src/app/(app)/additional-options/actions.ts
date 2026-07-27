"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/authz";
import { parseNumberInput, parseTextInput, requireWholeNumber } from "@/lib/format";
import { logActivity, diffFields } from "@/lib/activity";

const FIELDS = [
  "ics",
  "materialName",
  "partNumber",
  "category",
  "spq",
  "delivery",
  "unitPrice",
  "oldUnitPrice",
];

function readForm(formData: FormData) {
  const spq = requireWholeNumber(parseNumberInput(formData.get("spq")), "SPQ");
  const delivery = parseNumberInput(formData.get("delivery"));
  if (spq && delivery % spq !== 0) {
    throw new Error(
      `Delivery (${delivery}) does not divide evenly into whole boxes of SPQ ${spq} (${(delivery / spq).toFixed(2)} boxes) — SPQ Check requires a whole number of boxes.`,
    );
  }
  return {
    ics: parseTextInput(formData.get("ics")),
    materialName: parseTextInput(formData.get("materialName")),
    partNumber: parseTextInput(formData.get("partNumber")),
    category: parseTextInput(formData.get("category")),
    spq,
    delivery,
    unitPrice: parseNumberInput(formData.get("unitPrice")),
    oldUnitPrice: parseNumberInput(formData.get("oldUnitPrice")),
  };
}

function productLabel(data: { ics: string | null; materialName: string | null }, no: number) {
  return data.ics ?? data.materialName ?? `Product #${no}`;
}

export async function createProduct(formData: FormData) {
  await requireEditor();
  const data = readForm(formData);
  const product = await prisma.product.create({ data });
  await logActivity({
    action: "CREATE",
    entityType: "Product",
    entityLabel: productLabel(data, product.no),
    changes: diffFields(null, data, FIELDS),
  });
  revalidatePath("/additional-options");
  redirect("/additional-options?flash=Product created");
}

export async function updateProduct(id: string, formData: FormData) {
  await requireEditor();
  const data = readForm(formData);
  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) {
    throw new Error("Product not found");
  }
  await prisma.product.update({ where: { id }, data });
  await logActivity({
    action: "UPDATE",
    entityType: "Product",
    entityLabel: productLabel(data, before.no),
    changes: diffFields(before, data, FIELDS),
  });
  revalidatePath("/additional-options");
  redirect("/additional-options?flash=Product updated");
}

export async function deleteProduct(id: string) {
  await requireEditor();
  const product = await prisma.product.delete({ where: { id } });
  await logActivity({
    action: "DELETE",
    entityType: "Product",
    entityLabel: productLabel(product, product.no),
    changes: diffFields(product, null, FIELDS),
  });
  revalidatePath("/additional-options");
}
