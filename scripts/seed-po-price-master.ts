// One-off seed: applies a partial PO_Price_Master extract (pasted as text, not
// a full JSCPH workbook) to JscphPart price fields + PoPriceEntry quantities.
// Dry-runs by default; pass --commit to actually write.
//
// Usage:
//   tsx scripts/seed-po-price-master.ts            (dry run, prints what would change)
//   tsx scripts/seed-po-price-master.ts --commit    (writes to the database)
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "data/po-price-master-2026-07.tsv");
const HEADER_PHYSICAL_LINES = 6; // header row's price/PO-number labels wrap across 6 lines
const PO_QTY_FIELD_INDEXES = [5, 7, 9, 11, 13, 15, 17, 19, 21, 23]; // 0-indexed, matches jscph.ts's F,H,J,L,N,P,R,T,V,X

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function parseNum(raw: string | undefined): number | null {
  const t = (raw ?? "").trim();
  if (t === "" || t === "-") return null;
  const n = Number(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseStr(raw: string | undefined): string | null {
  const t = (raw ?? "").trim();
  return t === "" ? null : t;
}

interface ParsedPart {
  code: string;
  partName: string | null;
  classification: string | null;
  unitPricePurchase: number | null;
  unitPriceSales: number | null;
  poEntries: { poNumber: string; qty: number }[];
}

function parseData(): ParsedPart[] {
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);

  const headerJoined = lines.slice(0, HEADER_PHYSICAL_LINES).join(" ");
  const headerFields = headerJoined.split("\t");
  const poNumbers = PO_QTY_FIELD_INDEXES.map((i) => parseStr(headerFields[i]));

  const parts: ParsedPart[] = [];
  for (const line of lines.slice(HEADER_PHYSICAL_LINES)) {
    const fields = line.split("\t");
    if (fields.length < 27) {
      console.warn(`Skipping malformed row (${fields.length} fields, expected 27): ${line.slice(0, 40)}...`);
      continue;
    }
    const code = parseStr(fields[0]);
    if (!code) continue;

    const poEntries: { poNumber: string; qty: number }[] = [];
    for (let i = 0; i < PO_QTY_FIELD_INDEXES.length; i++) {
      const poNumber = poNumbers[i];
      if (!poNumber) continue;
      const qty = parseNum(fields[PO_QTY_FIELD_INDEXES[i]]);
      if (qty === null) continue;
      poEntries.push({ poNumber, qty });
    }

    parts.push({
      code,
      partName: parseStr(fields[1]),
      classification: parseStr(fields[2]),
      unitPricePurchase: parseNum(fields[3]),
      unitPriceSales: parseNum(fields[4]),
      poEntries,
    });
  }
  return parts;
}

async function main() {
  const commit = process.argv.includes("--commit");
  const parts = parseData();

  const withPoEntries = parts.filter((p) => p.poEntries.length > 0);
  console.log(`Parsed ${parts.length} parts, ${withPoEntries.length} with at least one PO quantity.`);
  console.log("Sample of parts with PO quantities:");
  for (const p of withPoEntries) {
    console.log(`  ${p.code} (${p.partName}): ${p.poEntries.map((e) => `${e.poNumber}=${e.qty}`).join(", ")}`);
  }

  if (!commit) {
    console.log("\nDry run only — no changes written. Re-run with --commit to apply.");
    return;
  }

  let partsCreated = 0;
  let partsUpdated = 0;
  let entriesCreated = 0;
  let entriesUpdated = 0;

  for (const p of parts) {
    const data: Record<string, unknown> = {};
    if (p.partName !== null) data.partName = p.partName;
    if (p.classification !== null) data.classification = p.classification;
    if (p.unitPricePurchase !== null) data.unitPricePurchase = p.unitPricePurchase;
    if (p.unitPriceSales !== null) data.unitPriceSales = p.unitPriceSales;

    const existing = await prisma.jscphPart.findUnique({ where: { code: p.code }, select: { id: true } });
    const part = await prisma.jscphPart.upsert({
      where: { code: p.code },
      update: data,
      create: { code: p.code, ...data },
    });
    if (existing) partsUpdated++;
    else partsCreated++;

    for (const entry of p.poEntries) {
      const existingEntry = await prisma.poPriceEntry.findUnique({
        where: { partId_poNumber: { partId: part.id, poNumber: entry.poNumber } },
        select: { id: true },
      });
      await prisma.poPriceEntry.upsert({
        where: { partId_poNumber: { partId: part.id, poNumber: entry.poNumber } },
        update: { qty: entry.qty },
        create: { partId: part.id, poNumber: entry.poNumber, qty: entry.qty },
      });
      if (existingEntry) entriesUpdated++;
      else entriesCreated++;
    }
  }

  console.log(
    `\nJscphPart: ${partsCreated} created, ${partsUpdated} updated. PoPriceEntry: ${entriesCreated} created, ${entriesUpdated} updated.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
