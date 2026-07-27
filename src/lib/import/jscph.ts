import type ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { cellValue, toStr, toNum, toDate, compact, emptyCounts, type ImportCounts } from "./utils";
import { importComputedSheet } from "./computed";
import { crossedIntoNegative, notifyNegativeStockBatch, type NegativeStockItem } from "@/lib/discord";

const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

async function upsertJscphPart(
  code: string,
  fields: {
    ics1?: string | null;
    partName?: string | null;
    modelName?: string | null;
    spq?: number | null;
    unitPricePurchase?: number | null;
    unitPriceSales?: number | null;
  },
): Promise<{ id: string; wasCreated: boolean }> {
  const existing = await prisma.jscphPart.findUnique({ where: { code } });
  if (existing) {
    await prisma.jscphPart.update({ where: { code }, data: compact(fields) });
    return { id: existing.id, wasCreated: false };
  }
  const created = await prisma.jscphPart.create({ data: { code, ...compact(fields) } });
  return { id: created.id, wasCreated: true };
}

// --- PO_Price_Master: header row 3 (PO numbers live in this row for the raw
// qty columns), data row 4+. Column A is the true unique part code.
async function importPoPriceMaster(
  ws: ExcelJS.Worksheet,
): Promise<{ parts: ImportCounts; entries: ImportCounts }> {
  const parts = emptyCounts();
  const entries = emptyCounts();

  const headerRow = ws.getRow(3);
  const qtyCols = ["F", "H", "J", "L", "N", "P", "R", "T", "V", "X"] as const;
  const poNumbers = qtyCols.map((c) => toStr(cellValue(headerRow.getCell(c))));

  const lastRow = ws.rowCount;
  for (let r = 4; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const code = toStr(cellValue(row.getCell("A")));
    if (!code) continue;

    const { id: partId, wasCreated } = await upsertJscphPart(code, {
      partName: toStr(cellValue(row.getCell("B"))),
      ics1: toStr(cellValue(row.getCell("C"))),
      unitPricePurchase: toNum(cellValue(row.getCell("D"))),
      unitPriceSales: toNum(cellValue(row.getCell("E"))),
    });
    if (wasCreated) parts.created++;
    else parts.updated++;

    for (let i = 0; i < qtyCols.length; i++) {
      const poNumber = poNumbers[i];
      if (!poNumber) continue;
      const qty = toNum(cellValue(row.getCell(qtyCols[i])));
      if (qty === null) continue;

      const key = { partId_poNumber: { partId, poNumber } };
      const existingEntry = await prisma.poPriceEntry.findUnique({ where: key });
      await prisma.poPriceEntry.upsert({
        where: key,
        create: { partId, poNumber, qty },
        update: { qty },
      });
      if (existingEntry) entries.updated++;
      else entries.created++;
    }
  }

  return { parts, entries };
}

// --- Forecast_CALQ: header row 3, data row 4+. Column B is the true unique
// part code; column A here is actually the short category code. Only used to
// enrich the shared JscphPart identity fields — the per-month USAGE/ORDER
// columns are fully formula-derived and not imported in Phase 1.
async function importForecastCalqIdentity(ws: ExcelJS.Worksheet): Promise<ImportCounts> {
  const parts = emptyCounts();
  const lastRow = ws.rowCount;

  for (let r = 4; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const code = toStr(cellValue(row.getCell("B")));
    if (!code) continue;

    const { wasCreated } = await upsertJscphPart(code, {
      ics1: toStr(cellValue(row.getCell("A"))),
      partName: toStr(cellValue(row.getCell("C"))),
      modelName: toStr(cellValue(row.getCell("D"))),
      spq: toNum(cellValue(row.getCell("E"))),
    });
    if (wasCreated) parts.created++;
    else parts.updated++;
  }

  return parts;
}

// --- tblDelivery_Quantity: header row 3, data row 4+. Same identity-column
// layout as Forecast_CALQ. F/G/H are the raw BOH/Incoming A/Incoming B inputs
// (the per-day columns are formula pulls from SEP DS and are not imported here).
async function importTblDeliveryQuantity(
  ws: ExcelJS.Worksheet,
): Promise<{ parts: ImportCounts; adjustments: ImportCounts; newlyNegative: NegativeStockItem[] }> {
  const parts = emptyCounts();
  const adjustments = emptyCounts();
  const newlyNegative: NegativeStockItem[] = [];
  const lastRow = ws.rowCount;

  for (let r = 4; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const code = toStr(cellValue(row.getCell("B")));
    if (!code) continue;

    const { id: partId, wasCreated } = await upsertJscphPart(code, {
      ics1: toStr(cellValue(row.getCell("A"))),
      partName: toStr(cellValue(row.getCell("C"))),
      modelName: toStr(cellValue(row.getCell("D"))),
      spq: toNum(cellValue(row.getCell("E"))),
    });
    if (wasCreated) parts.created++;
    else parts.updated++;

    const boh = toNum(cellValue(row.getCell("F")));
    const incomingA = toNum(cellValue(row.getCell("G")));
    const incomingB = toNum(cellValue(row.getCell("H")));
    if (boh !== null || incomingA !== null || incomingB !== null) {
      const existingAdj = await prisma.deliveryAdjustment.findUnique({ where: { partId } });
      await prisma.deliveryAdjustment.upsert({
        where: { partId },
        create: { partId, boh, incomingA, incomingB },
        update: { boh, incomingA, incomingB },
      });
      if (existingAdj) adjustments.updated++;
      else adjustments.created++;

      if (crossedIntoNegative(existingAdj?.boh, boh)) {
        newlyNegative.push({ partLabel: code, field: "BOH", qty: boh! });
      }
    }
  }

  return { parts, adjustments, newlyNegative };
}

// --- SEP FCT: header row 2 has bare month abbreviations (no year) starting at
// column G, data row 3+. This is the true raw source for monthly forecast usage.
// Calendar year is inferred sequentially from `referenceYear`, rolling over
// whenever a column's month abbreviation wraps back past December.
async function importSepFct(ws: ExcelJS.Worksheet, referenceYear: number): Promise<ImportCounts> {
  const usages = emptyCounts();

  const headerRow = ws.getRow(2);
  const monthCols: { col: number; year: number; month: number }[] = [];
  let prevMonthIndex = -1;
  let year = referenceYear;
  for (let col = 7; col <= 24; col++) {
    const label = toStr(cellValue(headerRow.getCell(col)));
    if (!label) break;
    const monthIndex = MONTH_ABBR.indexOf(label.toUpperCase());
    if (monthIndex === -1) break;
    if (monthIndex < prevMonthIndex) year++;
    prevMonthIndex = monthIndex;
    monthCols.push({ col, year, month: monthIndex });
  }

  const lastRow = ws.rowCount;
  for (let r = 3; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const code = toStr(cellValue(row.getCell("B")));
    if (!code) continue;

    const { id: partId } = await upsertJscphPart(code, {
      partName: toStr(cellValue(row.getCell("C"))),
    });

    for (const mc of monthCols) {
      const usageQty = toNum(cellValue(row.getCell(mc.col)));
      if (usageQty === null) continue;
      const month = new Date(Date.UTC(mc.year, mc.month, 1));
      const key = { partId_month: { partId, month } };
      const existing = await prisma.monthlyForecastUsage.findUnique({ where: key });
      await prisma.monthlyForecastUsage.upsert({
        where: key,
        create: { partId, month, usageQty },
        update: { usageQty },
      });
      if (existing) usages.updated++;
      else usages.created++;
    }
  }

  return usages;
}

// --- SEP DS: header row 5 has real dates starting at column D, data row 6+.
// This is the true raw source for daily delivery quantities.
async function importSepDs(ws: ExcelJS.Worksheet): Promise<ImportCounts> {
  const deliveries = emptyCounts();

  const headerRow = ws.getRow(5);
  const dateCols: { col: number; date: Date }[] = [];
  for (let col = 4; col <= 60; col++) {
    const date = toDate(cellValue(headerRow.getCell(col)));
    if (!date) break;
    dateCols.push({ col, date });
  }

  const lastRow = ws.rowCount;
  for (let r = 6; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const code = toStr(cellValue(row.getCell("B")));
    if (!code) continue;

    const { id: partId } = await upsertJscphPart(code, {
      partName: toStr(cellValue(row.getCell("C"))),
    });

    for (const dc of dateCols) {
      const qty = toNum(cellValue(row.getCell(dc.col)));
      if (qty === null) continue;
      const key = { partId_date: { partId, date: dc.date } };
      const existing = await prisma.dailyDeliveryQty.findUnique({ where: key });
      await prisma.dailyDeliveryQty.upsert({
        where: key,
        create: { partId, date: dc.date, qty },
        update: { qty },
      });
      if (existing) deliveries.updated++;
      else deliveries.created++;
    }
  }

  return deliveries;
}

export async function importJscphWorkbook(workbook: ExcelJS.Workbook, referenceYear: number) {
  const poPriceMaster = workbook.getWorksheet("PO_Price_Master");
  const forecastCalq = workbook.getWorksheet("Forecast_CALQ");
  const tblDeliveryQuantity = workbook.getWorksheet("tblDelivery_Quantity");
  const sepFct = workbook.getWorksheet("SEP FCT");
  const sepDs = workbook.getWorksheet("SEP DS");
  const tblSalesAmount = workbook.getWorksheet("tbl_SalesAmount");
  const spqCheck = workbook.getWorksheet("SPQ_Check");
  const stockRatioResin = workbook.getWorksheet("STOCK RATIO RESIN");
  const runningStockResin = workbook.getWorksheet("RUNNING STOCK (Resin)");

  if (
    !poPriceMaster ||
    !forecastCalq ||
    !tblDeliveryQuantity ||
    !sepFct ||
    !sepDs ||
    !tblSalesAmount ||
    !spqCheck ||
    !stockRatioResin ||
    !runningStockResin
  ) {
    throw new Error("One or more expected JSCPH sheets were not found in this workbook.");
  }

  const poPriceResult = await importPoPriceMaster(poPriceMaster);
  const forecastParts = await importForecastCalqIdentity(forecastCalq);
  const deliveryResult = await importTblDeliveryQuantity(tblDeliveryQuantity);
  const forecastUsage = await importSepFct(sepFct, referenceYear);
  const dailyDelivery = await importSepDs(sepDs);

  await notifyNegativeStockBatch("JSCPH", deliveryResult.newlyNegative);

  const computedSheets: Record<string, number> = {};
  computedSheets["tbl_SalesAmount"] = await importComputedSheet({
    sourceFile: "JSCPH",
    sheetName: "tbl_SalesAmount",
    worksheet: tblSalesAmount,
    headerRow: 3,
    dataStartRow: 4,
    maxCol: tblSalesAmount.columnCount,
  });
  computedSheets["SPQ_Check"] = await importComputedSheet({
    sourceFile: "JSCPH",
    sheetName: "SPQ_Check",
    worksheet: spqCheck,
    headerRow: 3,
    dataStartRow: 4,
    maxCol: spqCheck.columnCount,
  });
  computedSheets["STOCK RATIO RESIN"] = await importComputedSheet({
    sourceFile: "JSCPH",
    sheetName: "STOCK RATIO RESIN",
    worksheet: stockRatioResin,
    headerRow: 10,
    dataStartRow: 11,
    maxCol: stockRatioResin.columnCount,
  });
  computedSheets["RUNNING STOCK (Resin)"] = await importComputedSheet({
    sourceFile: "JSCPH",
    sheetName: "RUNNING STOCK (Resin)",
    worksheet: runningStockResin,
    headerRow: 2,
    dataStartRow: 4,
    maxCol: runningStockResin.columnCount,
  });

  // Full "as imported" snapshots for the remaining sheets too — including
  // ones already partially captured as raw/editable fields above — so the
  // Reports section always mirrors exactly what's in the workbook, formulas
  // (PO totals, running stock projections, per-month usage/order, etc.)
  // included, not just the columns we treat as raw/editable.
  computedSheets["PO_Price_Master"] = await importComputedSheet({
    sourceFile: "JSCPH",
    sheetName: "PO_Price_Master",
    worksheet: poPriceMaster,
    headerRow: 3,
    dataStartRow: 4,
    maxCol: poPriceMaster.columnCount,
  });
  computedSheets["Forecast_CALQ"] = await importComputedSheet({
    sourceFile: "JSCPH",
    sheetName: "Forecast_CALQ",
    worksheet: forecastCalq,
    headerRow: 3,
    dataStartRow: 4,
    maxCol: forecastCalq.columnCount,
  });
  computedSheets["tblDelivery_Quantity"] = await importComputedSheet({
    sourceFile: "JSCPH",
    sheetName: "tblDelivery_Quantity",
    worksheet: tblDeliveryQuantity,
    headerRow: 3,
    dataStartRow: 4,
    maxCol: tblDeliveryQuantity.columnCount,
  });
  computedSheets["SEP FCT"] = await importComputedSheet({
    sourceFile: "JSCPH",
    sheetName: "SEP FCT",
    worksheet: sepFct,
    headerRow: 2,
    dataStartRow: 3,
    maxCol: sepFct.columnCount,
  });
  computedSheets["SEP DS"] = await importComputedSheet({
    sourceFile: "JSCPH",
    sheetName: "SEP DS",
    worksheet: sepDs,
    headerRow: 5,
    dataStartRow: 6,
    maxCol: sepDs.columnCount,
  });

  return {
    entities: {
      JscphPart: {
        created:
          poPriceResult.parts.created + forecastParts.created + deliveryResult.parts.created,
        updated:
          poPriceResult.parts.updated + forecastParts.updated + deliveryResult.parts.updated,
        unchanged: 0,
        skipped: 0,
      },
      PoPriceEntry: poPriceResult.entries,
      DeliveryAdjustment: deliveryResult.adjustments,
      MonthlyForecastUsage: forecastUsage,
      DailyDeliveryQty: dailyDelivery,
    },
    computedSheets,
  };
}
