import type ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { cellValue, toStr, toNum, toDate, emptyCounts, type ImportCounts } from "./utils";
import { importComputedSheet } from "./computed";

// --- Receiving_Report: fully flat, no formulas at all. Header row 1, data row 2+.
async function importReceivingReport(ws: ExcelJS.Worksheet): Promise<ImportCounts> {
  const counts = emptyCounts();
  const lastRow = ws.rowCount;

  for (let r = 2; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const no = toNum(cellValue(row.getCell("B")));
    const ics = toStr(cellValue(row.getCell("C")));
    if (no === null || !ics) continue; // blank/trailing row

    const data = {
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
    };

    const existing = await prisma.receivingRecord.findUnique({ where: { no } });
    if (existing) {
      await prisma.receivingRecord.update({ where: { no }, data });
      counts.updated++;
    } else {
      await prisma.receivingRecord.create({ data: { no, ...data } });
      counts.created++;
    }
  }

  return counts;
}

// --- TREND: header row 7, data row 8+. Columns A-E identity, G-K per-customer
// weekly demand (labels read from the header row), M current inventory qty.
// The "as of" date for that inventory count lives in a single cell (M6) shared
// across all parts, not per-row.
async function importTrend(
  ws: ExcelJS.Worksheet,
): Promise<{ parts: ImportCounts; demands: ImportCounts }> {
  const parts = emptyCounts();
  const demands = emptyCounts();

  const inventoryAsOf = toDate(cellValue(ws.getRow(6).getCell("M")));
  const headerRow = ws.getRow(7);
  const demandCols = ["G", "H", "I", "J", "K"] as const;
  const demandLabels = demandCols.map((c) => toStr(cellValue(headerRow.getCell(c))) ?? c);

  const lastRow = ws.rowCount;
  for (let r = 8; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const ics = toStr(cellValue(row.getCell("D")));
    if (!ics) continue;

    const data = {
      no: toStr(cellValue(row.getCell("A"))),
      partNumber: toStr(cellValue(row.getCell("B"))),
      category: toStr(cellValue(row.getCell("C"))),
      maker: toStr(cellValue(row.getCell("E"))),
      inventoryQty: toNum(cellValue(row.getCell("M"))),
      inventoryAsOf,
    };

    const existing = await prisma.ecompPart.findUnique({ where: { ics } });
    const part = existing
      ? await prisma.ecompPart.update({ where: { ics }, data })
      : await prisma.ecompPart.create({ data: { ics, ...data } });
    if (existing) parts.updated++;
    else parts.created++;

    for (let i = 0; i < demandCols.length; i++) {
      const qty = toNum(cellValue(row.getCell(demandCols[i])));
      if (qty === null) continue;
      const customerCode = demandLabels[i];
      const existingDemand = await prisma.ecompCustomerDemand.findUnique({
        where: { partId_customerCode: { partId: part.id, customerCode } },
      });
      await prisma.ecompCustomerDemand.upsert({
        where: { partId_customerCode: { partId: part.id, customerCode } },
        create: { partId: part.id, customerCode, qty },
        update: { qty },
      });
      if (existingDemand) demands.updated++;
      else demands.created++;
    }
  }

  return { parts, demands };
}

// --- Open_PO_Supplier / Open_PO_Amount: header row 7, data row 8+. Columns A-E
// identity, G-J per-customer order qty (labels from the header row). The
// "Amount" sheet additionally carries a raw per-part unit price at W.
async function importOpenPoSheet(
  ws: ExcelJS.Worksheet,
  sourceSheet: "SUPPLIER" | "AMOUNT",
): Promise<{ lines: ImportCounts; demands: ImportCounts }> {
  const lines = emptyCounts();
  const demands = emptyCounts();

  const headerRow = ws.getRow(7);
  const demandCols = ["G", "H", "I", "J"] as const;
  const demandLabels = demandCols.map((c) => toStr(cellValue(headerRow.getCell(c))) ?? c);

  const lastRow = ws.rowCount;
  for (let r = 8; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const ics = toStr(cellValue(row.getCell("D")));
    if (!ics) continue;

    const data = {
      no: toStr(cellValue(row.getCell("A"))),
      partNumber: toStr(cellValue(row.getCell("B"))),
      category: toStr(cellValue(row.getCell("C"))),
      maker: toStr(cellValue(row.getCell("E"))),
      unitPrice: sourceSheet === "AMOUNT" ? toNum(cellValue(row.getCell("W"))) : null,
    };

    const key = { sourceSheet_ics: { sourceSheet, ics } };
    const existing = await prisma.openPoLine.findUnique({ where: key });
    const line = existing
      ? await prisma.openPoLine.update({ where: key, data })
      : await prisma.openPoLine.create({ data: { sourceSheet, ics, ...data } });
    if (existing) lines.updated++;
    else lines.created++;

    for (let i = 0; i < demandCols.length; i++) {
      const qty = toNum(cellValue(row.getCell(demandCols[i])));
      if (qty === null) continue;
      const customerCode = demandLabels[i];
      const demandKey = { lineId_customerCode: { lineId: line.id, customerCode } };
      const existingDemand = await prisma.openPoCustomerDemand.findUnique({ where: demandKey });
      await prisma.openPoCustomerDemand.upsert({
        where: demandKey,
        create: { lineId: line.id, customerCode, qty },
        update: { qty },
      });
      if (existingDemand) demands.updated++;
      else demands.created++;
    }
  }

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

  // Full "as imported" snapshots for every sheet — including the columns
  // already captured as raw/editable fields above — so the Reports section
  // always mirrors exactly what's in the workbook, formulas included.
  const computedSheets: Record<string, number> = {};
  computedSheets["TREND"] = await importComputedSheet({
    sourceFile: "ECOMP",
    sheetName: "TREND",
    worksheet: trend,
    headerRow: 7,
    dataStartRow: 8,
    maxCol: trend.columnCount,
  });
  computedSheets["Open_PO_Supplier"] = await importComputedSheet({
    sourceFile: "ECOMP",
    sheetName: "Open_PO_Supplier",
    worksheet: openPoSupplier,
    headerRow: 7,
    dataStartRow: 8,
    maxCol: openPoSupplier.columnCount,
  });
  computedSheets["Open_PO_Amount"] = await importComputedSheet({
    sourceFile: "ECOMP",
    sheetName: "Open_PO_Amount",
    worksheet: openPoAmount,
    headerRow: 7,
    dataStartRow: 8,
    maxCol: openPoAmount.columnCount,
  });

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
