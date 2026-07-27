import type ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import {
  cellValue,
  toStr,
  toNum,
  toDate,
  emptyCounts,
  bulkUpsertChildren,
  type ImportCounts,
} from "./utils";
import { importComputedSheet } from "./computed";
import { crossedIntoNegative, notifyNegativeStockBatch, type NegativeStockItem } from "@/lib/discord";

// --- Receiving_Report: fully flat, no formulas at all. Header row 1, data row 2+.
async function importReceivingReport(ws: ExcelJS.Worksheet): Promise<ImportCounts> {
  const lastRow = ws.rowCount;

  interface Row {
    no: number;
    data: {
      ics: string;
      partName: string | null;
      supplier: string | null;
      maker: string | null;
      commodity: string | null;
      price: number | null;
      poNumber: string | null;
      etd: Date | null;
      eta: Date | null;
      qty: number | null;
      inTransit: number | null;
      remarks: string | null;
    };
  }
  const rows: Row[] = [];
  for (let r = 2; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const no = toNum(cellValue(row.getCell("B")));
    const ics = toStr(cellValue(row.getCell("C")));
    if (no === null || !ics) continue; // blank/trailing row

    rows.push({
      no,
      data: {
        ics,
        partName: toStr(cellValue(row.getCell("D"))),
        supplier: toStr(cellValue(row.getCell("E"))),
        maker: toStr(cellValue(row.getCell("F"))),
        commodity: toStr(cellValue(row.getCell("G"))),
        price: toNum(cellValue(row.getCell("H"))),
        poNumber: toStr(cellValue(row.getCell("L"))),
        etd: toDate(cellValue(row.getCell("M"))),
        eta: toDate(cellValue(row.getCell("N"))),
        qty: toNum(cellValue(row.getCell("O"))),
        inTransit: toNum(cellValue(row.getCell("P"))),
        remarks: toStr(cellValue(row.getCell("Q"))),
      },
    });
  }

  const existing = await prisma.receivingRecord.findMany({
    where: { no: { in: rows.map((r) => r.no) } },
    select: { no: true },
  });
  const existingNos = new Set(existing.map((e) => String(e.no)));

  return bulkUpsertChildren({
    jobs: rows,
    keyOf: (r) => String(r.no),
    existingKeys: existingNos,
    createData: (r) => ({ no: r.no, ...r.data }),
    updateWhere: (r) => ({ no: r.no }),
    updateData: (r) => r.data,
    createMany: (data) => prisma.receivingRecord.createMany({ data, skipDuplicates: true }),
    update: (args) => prisma.receivingRecord.update(args),
  });
}

// --- TREND: header row 7, data row 8+. Columns A-E identity, G-K per-customer
// weekly demand (labels read from the header row), M current inventory qty.
// The "as of" date for that inventory count lives in a single cell (M6) shared
// across all parts, not per-row.
async function importTrend(
  ws: ExcelJS.Worksheet,
): Promise<{ parts: ImportCounts; demands: ImportCounts; newlyNegative: NegativeStockItem[] }> {
  const newlyNegative: NegativeStockItem[] = [];

  const inventoryAsOf = toDate(cellValue(ws.getRow(6).getCell("M")));
  const headerRow = ws.getRow(7);
  const demandCols = ["G", "H", "I", "J", "K"] as const;
  const demandLabels = demandCols.map((c) => toStr(cellValue(headerRow.getCell(c))) ?? c);

  interface Row {
    ics: string;
    data: {
      no: string | null;
      partNumber: string | null;
      category: string | null;
      maker: string | null;
      inventoryQty: number | null;
      inventoryAsOf: Date | null;
    };
    demandEntries: { customerCode: string; qty: number }[];
  }
  const rows: Row[] = [];
  const lastRow = ws.rowCount;
  for (let r = 8; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const ics = toStr(cellValue(row.getCell("D")));
    if (!ics) continue;

    const demandEntries: { customerCode: string; qty: number }[] = [];
    for (let i = 0; i < demandCols.length; i++) {
      const qty = toNum(cellValue(row.getCell(demandCols[i])));
      if (qty === null) continue;
      demandEntries.push({ customerCode: demandLabels[i], qty });
    }

    rows.push({
      ics,
      data: {
        no: toStr(cellValue(row.getCell("A"))),
        partNumber: toStr(cellValue(row.getCell("B"))),
        category: toStr(cellValue(row.getCell("C"))),
        maker: toStr(cellValue(row.getCell("E"))),
        inventoryQty: toNum(cellValue(row.getCell("M"))),
        inventoryAsOf,
      },
      demandEntries,
    });
  }

  const existingParts = await prisma.ecompPart.findMany({
    where: { ics: { in: rows.map((r) => r.ics) } },
  });
  const existingByIcs = new Map(existingParts.map((p) => [p.ics, p]));

  for (const r of rows) {
    const existing = existingByIcs.get(r.ics);
    if (crossedIntoNegative(existing?.inventoryQty, r.data.inventoryQty)) {
      newlyNegative.push({ partLabel: r.ics, field: "Inventory Qty", qty: r.data.inventoryQty! });
    }
  }

  const existingIcsSet = new Set(existingByIcs.keys());
  const parts = await bulkUpsertChildren({
    jobs: rows,
    keyOf: (r) => r.ics,
    existingKeys: existingIcsSet,
    createData: (r) => ({ ics: r.ics, ...r.data }),
    updateWhere: (r) => ({ ics: r.ics }),
    updateData: (r) => r.data,
    createMany: (data) => prisma.ecompPart.createMany({ data, skipDuplicates: true }),
    update: (args) => prisma.ecompPart.update(args),
  });

  const partIds = await prisma.ecompPart.findMany({
    where: { ics: { in: rows.map((r) => r.ics) } },
    select: { id: true, ics: true },
  });
  const idsByIcs = new Map(partIds.map((p) => [p.ics, p.id]));

  const demandJobs = rows.flatMap((r) =>
    r.demandEntries.map((d) => ({ partId: idsByIcs.get(r.ics)!, ...d })),
  );
  const existingDemands = await prisma.ecompCustomerDemand.findMany({
    where: { partId: { in: [...idsByIcs.values()] } },
    select: { partId: true, customerCode: true },
  });
  const existingDemandKeys = new Set(existingDemands.map((d) => `${d.partId}::${d.customerCode}`));

  const demands = await bulkUpsertChildren({
    jobs: demandJobs,
    keyOf: (j) => `${j.partId}::${j.customerCode}`,
    existingKeys: existingDemandKeys,
    createData: (j) => j,
    updateWhere: (j) => ({ partId_customerCode: { partId: j.partId, customerCode: j.customerCode } }),
    updateData: (j) => ({ qty: j.qty }),
    createMany: (data) => prisma.ecompCustomerDemand.createMany({ data, skipDuplicates: true }),
    update: (args) => prisma.ecompCustomerDemand.update(args),
  });

  return { parts, demands, newlyNegative };
}

// --- Open_PO_Supplier / Open_PO_Amount: header row 7, data row 8+. Columns A-E
// identity, G-J per-customer order qty (labels from the header row). The
// "Amount" sheet additionally carries a raw per-part unit price at W.
async function importOpenPoSheet(
  ws: ExcelJS.Worksheet,
  sourceSheet: "SUPPLIER" | "AMOUNT",
): Promise<{ lines: ImportCounts; demands: ImportCounts }> {
  const headerRow = ws.getRow(7);
  const demandCols = ["G", "H", "I", "J"] as const;
  const demandLabels = demandCols.map((c) => toStr(cellValue(headerRow.getCell(c))) ?? c);

  interface Row {
    ics: string;
    data: {
      no: string | null;
      partNumber: string | null;
      category: string | null;
      maker: string | null;
      unitPrice: number | null;
    };
    demandEntries: { customerCode: string; qty: number }[];
  }
  const rows: Row[] = [];
  const lastRow = ws.rowCount;
  for (let r = 8; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const ics = toStr(cellValue(row.getCell("D")));
    if (!ics) continue;

    const demandEntries: { customerCode: string; qty: number }[] = [];
    for (let i = 0; i < demandCols.length; i++) {
      const qty = toNum(cellValue(row.getCell(demandCols[i])));
      if (qty === null) continue;
      demandEntries.push({ customerCode: demandLabels[i], qty });
    }

    rows.push({
      ics,
      data: {
        no: toStr(cellValue(row.getCell("A"))),
        partNumber: toStr(cellValue(row.getCell("B"))),
        category: toStr(cellValue(row.getCell("C"))),
        maker: toStr(cellValue(row.getCell("E"))),
        unitPrice: sourceSheet === "AMOUNT" ? toNum(cellValue(row.getCell("W"))) : null,
      },
      demandEntries,
    });
  }

  const existingLines = await prisma.openPoLine.findMany({
    where: { sourceSheet, ics: { in: rows.map((r) => r.ics) } },
    select: { ics: true },
  });
  const existingIcsSet = new Set(existingLines.map((l) => l.ics));

  const lines = await bulkUpsertChildren({
    jobs: rows,
    keyOf: (r) => r.ics,
    existingKeys: existingIcsSet,
    createData: (r) => ({ sourceSheet, ics: r.ics, ...r.data }),
    updateWhere: (r) => ({ sourceSheet_ics: { sourceSheet, ics: r.ics } }),
    updateData: (r) => r.data,
    createMany: (data) => prisma.openPoLine.createMany({ data, skipDuplicates: true }),
    update: (args) => prisma.openPoLine.update(args),
  });

  const lineRows = await prisma.openPoLine.findMany({
    where: { sourceSheet, ics: { in: rows.map((r) => r.ics) } },
    select: { id: true, ics: true },
  });
  const idsByIcs = new Map(lineRows.map((l) => [l.ics, l.id]));

  const demandJobs = rows.flatMap((r) =>
    r.demandEntries.map((d) => ({ lineId: idsByIcs.get(r.ics)!, ...d })),
  );
  const existingDemands = await prisma.openPoCustomerDemand.findMany({
    where: { lineId: { in: [...idsByIcs.values()] } },
    select: { lineId: true, customerCode: true },
  });
  const existingDemandKeys = new Set(existingDemands.map((d) => `${d.lineId}::${d.customerCode}`));

  const demands = await bulkUpsertChildren({
    jobs: demandJobs,
    keyOf: (j) => `${j.lineId}::${j.customerCode}`,
    existingKeys: existingDemandKeys,
    createData: (j) => j,
    updateWhere: (j) => ({ lineId_customerCode: { lineId: j.lineId, customerCode: j.customerCode } }),
    updateData: (j) => ({ qty: j.qty }),
    createMany: (data) => prisma.openPoCustomerDemand.createMany({ data, skipDuplicates: true }),
    update: (args) => prisma.openPoCustomerDemand.update(args),
  });

  return { lines, demands };
}

export async function importEcompWorkbook(workbook: ExcelJS.Workbook) {
  const receivingReport = workbook.getWorksheet("Receiving_Report");
  const trend = workbook.getWorksheet("TREND");
  const openPoSupplier = workbook.getWorksheet("Open_PO_Supplier");
  const openPoAmount = workbook.getWorksheet("Open_PO_Amount");

  if (!receivingReport || !trend || !openPoSupplier || !openPoAmount) {
    throw new Error(
      "Expected sheets TREND, Open_PO_Supplier, Open_PO_Amount, Receiving_Report were not all found in this workbook.",
    );
  }

  const receivingCounts = await importReceivingReport(receivingReport);
  const trendResult = await importTrend(trend);
  const supplierResult = await importOpenPoSheet(openPoSupplier, "SUPPLIER");
  const amountResult = await importOpenPoSheet(openPoAmount, "AMOUNT");

  await notifyNegativeStockBatch("ECOMP", trendResult.newlyNegative);

  // Full "as imported" snapshots for every sheet — including the columns
  // already captured as raw/editable fields above — so the Reports section
  // always mirrors exactly what's in the workbook, formulas included. These
  // are already bulk deleteMany+createMany internally and don't depend on
  // each other, so they run concurrently.
  const [trendCount, openPoSupplierCount, openPoAmountCount] = await Promise.all([
    importComputedSheet({
      sourceFile: "ECOMP",
      sheetName: "TREND",
      worksheet: trend,
      headerRow: 7,
      dataStartRow: 8,
      maxCol: trend.columnCount,
    }),
    importComputedSheet({
      sourceFile: "ECOMP",
      sheetName: "Open_PO_Supplier",
      worksheet: openPoSupplier,
      headerRow: 7,
      dataStartRow: 8,
      maxCol: openPoSupplier.columnCount,
    }),
    importComputedSheet({
      sourceFile: "ECOMP",
      sheetName: "Open_PO_Amount",
      worksheet: openPoAmount,
      headerRow: 7,
      dataStartRow: 8,
      maxCol: openPoAmount.columnCount,
    }),
  ]);

  const computedSheets: Record<string, number> = {
    TREND: trendCount,
    Open_PO_Supplier: openPoSupplierCount,
    Open_PO_Amount: openPoAmountCount,
  };

  return {
    entities: {
      ReceivingRecord: receivingCounts,
      EcompPart: trendResult.parts,
      EcompCustomerDemand: trendResult.demands,
      OpenPoLine: {
        created: supplierResult.lines.created + amountResult.lines.created,
        updated: supplierResult.lines.updated + amountResult.lines.updated,
        unchanged: 0,
        skipped: 0,
      },
      OpenPoCustomerDemand: {
        created: supplierResult.demands.created + amountResult.demands.created,
        updated: supplierResult.demands.updated + amountResult.demands.updated,
        unchanged: 0,
        skipped: 0,
      },
    },
    computedSheets,
  };
}
