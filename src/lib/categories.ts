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

// Union of categories already used on Ecomp Parts and on prior products —
// the Product table starts out empty, so sourcing only from Product itself
// would leave the dropdown with no real options to pick from.
export async function getProductCategories(): Promise<string[]> {
  const [ecompRows, productRows] = await Promise.all([
    prisma.ecompPart.findMany({
      where: { category: { not: null } },
      distinct: ["category"],
      select: { category: true },
    }),
    prisma.product.findMany({
      where: { category: { not: null } },
      distinct: ["category"],
      select: { category: true },
    }),
  ]);
  const categories = new Set<string>();
  for (const row of [...ecompRows, ...productRows]) {
    if (row.category) categories.add(row.category);
  }
  return [...categories].sort((a, b) => a.localeCompare(b));
}
