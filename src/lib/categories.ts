import { prisma } from "@/lib/prisma";

/** Distinct, non-blank category values already in use, for the Category
 * dropdown on create/edit forms — sourced from whatever's actually been
 * imported/entered rather than a hardcoded list. */
export async function getEcompCategories(): Promise<string[]> {
  const rows = await prisma.ecompPart.findMany({
    where: { category: { not: null } },
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category).filter((c): c is string => Boolean(c));
}

export async function getProductCategories(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { category: { not: null } },
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category).filter((c): c is string => Boolean(c));
}
