import type ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import {
  cellValue,
  toStr,
  toNum,
  toDate,
  compact,
  emptyCounts,
  findHeaderColumn,
  trimTrailingBlankColumns,
  bulkUpsertChildren,
  type ImportCounts,
} from "./utils";
import { importComputedSheet } from "./computed";
import { crossedIntoNegative, notifyNegativeStockBatch, type NegativeStockItem } from "@/lib/discord";

const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

interface JscphFields {
  classification?: string | null;
  partName?: string | null;
  modelName?: string | null;
  spq?: number | null;
  unitPricePurchase?: number | null;
  unitPriceSales?: number | null;
  [key: string]: unknown;
}

// Splits into a single bulk createMany() (fast, one round-trip, however many
// rows) for parts that don't exist yet, and individual concurrent update()
// calls only for the ones that do — on a fresh import (the common case,
// since re-imports start from an empty or lightly-changed table) that means
// the entire batch collapses to ~3 queries total instead of one round-trip
// per part, which is what was pushing imports past Vercel's function timeout.
// `knownCodes` is shared across every sheet's importer for a single workbook
// import, so a part created by an earlier sheet is correctly counted as
// "updated" (not "created") when a later sheet enriches it further — sheets
// are still imported one after another for this reason, only the rows
// *within* each sheet run concurrently/in bulk.
async function upsertJscphParts(
  entries: { code: string; fields: JscphFields }[],
  knownCodes: Set<string>,
): Promise<{ idsByCode: Map<string, string>; counts: ImportCounts }> {
  const counts = emptyCounts();
  if (entries.length === 0) return { idsByCode: new Map(), counts };

  const toCreate = entries.filter((e) => !knownCodes.has(e.code));
  const toUpdate = entries.filter((e) => knownCodes.has(e.code));

  if (toCreate.length > 0) {
    await prisma.jscphPart.createMany({
      data: toCreate.map((e) => ({ code: e.code, ...compact(e.fields) })),
      skipDuplicates: true,
    });
    counts.created += toCreate.length;
    for (const e of toCreate) knownCodes.add(e.code);
  }

  await Promise.all(
    toUpdate.map(async (e) => {
      await prisma.jscphPart.update({ where: { code: e.code }, data: compact(e.fields) });
      counts.updated++;
    }),
  );

  // createMany() doesn't return the rows it inserted, so fetch ids for the
  // whole batch (both branches) in one bulk query for downstream child writes.
  const rows = await prisma.jscphPart.findMany({
    where: { code: { in: entries.map((e) => e.code) } },
    select: { id: true, code: true },
  });
  const idsByCode = new Map(rows.map((r) => [r.code, r.id]));

  return { idsByCode, counts };
}

// --- PO_Price_Master: header row 3 (PO numbers live in this row for the raw
// qty columns), data row 4+. Column A is the true unique part code.
async function importPoPriceMaster(
  ws: ExcelJS.Worksheet,
  knownCodes: Set<string>,
): Promise<{ parts: ImportCounts; entries: ImportCounts }> {
  const headerRow = ws.getRow(3);
  const qtyCols = ["F", "H", "J", "L", "N", "P", "R", "T", "V", "X"] as const;
  const poNumbers = qtyCols.map((c) => toStr(cellValue(headerRow.getCell(c))));

  interface Row {
    code: string;
    fields: JscphFields;
    poEntries: { poNumber: string; qty: number }[];
  }
  const rows: Row[] = [];
  const lastRow = ws.rowCount;
  for (let r = 4; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const code = toStr(cellValue(row.getCell("A")));
    if (!code) continue;

    const poEntries: { poNumber: string; qty: number }[] = [];
    for (let i = 0; i < qtyCols.length; i++) {
      const poNumber = poNumbers[i];
      if (!poNumber) continue;
      const qty = toNum(cellValue(row.getCell(qtyCols[i])));
      if (qty === null) continue;
      poEntries.push({ poNumber, qty });
    }

    rows.push({
      code,
      fields: {
        partName: toStr(cellValue(row.getCell("B"))),
        classification: toStr(cellValue(row.getCell("C"))),
        unitPricePurchase: toNum(cellValue(row.getCell("D"))),
        unitPriceSales: toNum(cellValue(row.getCell("E"))),
      },
      poEntries,
    });
  }

  const { idsByCode, counts: parts } = await upsertJscphParts(
    rows.map((r) => ({ code: r.code, fields: r.fields })),
    knownCodes,
  );

  const poJobs = rows.flatMap((r) =>
    r.poEntries.map((e) => ({ partId: idsByCode.get(r.code)!, ...e })),
  );
  const existingEntries = await prisma.poPriceEntry.findMany({
    where: { partId: { in: [...idsByCode.values()] } },
    select: { partId: true, poNumber: true },
  });
  const existingKeys = new Set(existingEntries.map((e) => `${e.partId}::${e.poNumber}`));

  const entries = await bulkUpsertChildren({
    jobs: poJobs,
    keyOf: (j) => `${j.partId}::${j.poNumber}`,
    existingKeys,
    createData: (j) => j,
    updateWhere: (j) => ({ partId_poNumber: { partId: j.partId, poNumber: j.poNumber } }),
    updateData: (j) => ({ qty: j.qty }),
    createMany: (data) => prisma.poPriceEntry.createMany({ data, skipDuplicates: true }),
    update: (args) => prisma.poPriceEntry.update(args),
  });

  return { parts, entries };
}

// --- Forecast_CALQ: header row 3, data row 4+. Column B is the true unique
// part code; column A here is actually the short category code. Only used to
// enrich the shared JscphPart identity fields — the per-month USAGE/ORDER
// columns are fully formula-derived and not imported in Phase 1.
async function importForecastCalqIdentity(
  ws: ExcelJS.Worksheet,
  knownCodes: Set<string>,
): Promise<ImportCounts> {
  const rows: { code: string; fields: JscphFields }[] = [];
  const lastRow = ws.rowCount;
  for (let r = 4; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const code = toStr(cellValue(row.getCell("B")));
    if (!code) continue;

    rows.push({
      code,
      fields: {
        classification: toStr(cellValue(row.getCell("A"))),
        partName: toStr(cellValue(row.getCell("C"))),
        modelName: toStr(cellValue(row.getCell("D"))),
        spq: toNum(cellValue(row.getCell("E"))),
      },
    });
  }

  const { counts } = await upsertJscphParts(rows, knownCodes);
  return counts;
}

// --- tblDelivery_Quantity: header row 3, data row 4+. Same identity-column
// layout as Forecast_CALQ. F/G/H are the raw BOH/Incoming A/Incoming B inputs
// (the per-day columns are formula pulls from SEP DS and are not imported here).
async function importTblDeliveryQuantity(
  ws: ExcelJS.Worksheet,
  knownCodes: Set<string>,
): Promise<{ parts: ImportCounts; adjustments: ImportCounts; newlyNegative: NegativeStockItem[] }> {
  const adjustments = emptyCounts();
  const newlyNegative: NegativeStockItem[] = [];

  interface Row {
    code: string;
    fields: JscphFields;
    boh: number | null;
    incomingA: number | null;
    incomingB: number | null;
  }
  const rows: Row[] = [];
  const lastRow = ws.rowCount;
  for (let r = 4; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const code = toStr(cellValue(row.getCell("B")));
    if (!code) continue;

    rows.push({
      code,
      fields: {
        classification: toStr(cellValue(row.getCell("A"))),
        partName: toStr(cellValue(row.getCell("C"))),
        modelName: toStr(cellValue(row.getCell("D"))),
        spq: toNum(cellValue(row.getCell("E"))),
      },
      boh: toNum(cellValue(row.getCell("F"))),
      incomingA: toNum(cellValue(row.getCell("G"))),
      incomingB: toNum(cellValue(row.getCell("H"))),
    });
  }

  const { idsByCode, counts: parts } = await upsertJscphParts(
    rows.map((r) => ({ code: r.code, fields: r.fields })),
    knownCodes,
  );

  const adjRows = rows.filter((r) => r.boh !== null || r.incomingA !== null || r.incomingB !== null);
  const existingAdjustments = await prisma.deliveryAdjustment.findMany({
    where: { partId: { in: adjRows.map((r) => idsByCode.get(r.code)!) } },
  });
  const existingByPartId = new Map(existingAdjustments.map((a) => [a.partId, a]));

  for (const r of adjRows) {
    const partId = idsByCode.get(r.code)!;
    const existing = existingByPartId.get(partId);
    if (crossedIntoNegative(existing?.boh, r.boh)) {
      newlyNegative.push({ partLabel: r.code, field: "BOH", qty: r.boh! });
    }
  }

  const existingPartIds = new Set(existingByPartId.keys());
  const adjCounts = await bulkUpsertChildren({
    jobs: adjRows.map((r) => ({ partId: idsByCode.get(r.code)!, ...r })),
    keyOf: (j) => j.partId,
    existingKeys: existingPartIds,
    createData: (j) => ({
      partId: j.partId,
      boh: j.boh,
      incomingA: j.incomingA,
      incomingB: j.incomingB,
    }),
    updateWhere: (j) => ({ partId: j.partId }),
    updateData: (j) => ({ boh: j.boh, incomingA: j.incomingA, incomingB: j.incomingB }),
    createMany: (data) => prisma.deliveryAdjustment.createMany({ data, skipDuplicates: true }),
    update: (args) => prisma.deliveryAdjustment.update(args),
  });
  adjustments.created = adjCounts.created;
  adjustments.updated = adjCounts.updated;

  return { parts, adjustments, newlyNegative };
}

// --- SEP FCT: header row 2 has bare month abbreviations (no year) starting at
// column G, data row 3+. This is the true raw source for monthly forecast usage.
// Calendar year is inferred sequentially from `referenceYear`, rolling over
// whenever a column's month abbreviation wraps back past December.
async function importSepFct(
  ws: ExcelJS.Worksheet,
  referenceYear: number,
  knownCodes: Set<string>,
): Promise<ImportCounts> {
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

  interface Row {
    code: string;
    partName: string | null;
    usages: { month: Date; usageQty: number }[];
  }
  const rows: Row[] = [];
  const lastRow = ws.rowCount;
  for (let r = 3; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const code = toStr(cellValue(row.getCell("B")));
    if (!code) continue;

    const monthEntries: { month: Date; usageQty: number }[] = [];
    for (const mc of monthCols) {
      const usageQty = toNum(cellValue(row.getCell(mc.col)));
      if (usageQty === null) continue;
      monthEntries.push({ month: new Date(Date.UTC(mc.year, mc.month, 1)), usageQty });
    }
    rows.push({ code, partName: toStr(cellValue(row.getCell("C"))), usages: monthEntries });
  }

  const { idsByCode } = await upsertJscphParts(
    rows.map((r) => ({ code: r.code, fields: { partName: r.partName } })),
    knownCodes,
  );

  const usageJobs = rows.flatMap((r) =>
    r.usages.map((u) => ({ partId: idsByCode.get(r.code)!, ...u })),
  );
  const existingUsages = await prisma.monthlyForecastUsage.findMany({
    where: { partId: { in: [...idsByCode.values()] } },
    select: { partId: true, month: true },
  });
  const existingKeys = new Set(existingUsages.map((u) => `${u.partId}::${u.month.toISOString()}`));

  return bulkUpsertChildren({
    jobs: usageJobs,
    keyOf: (j) => `${j.partId}::${j.month.toISOString()}`,
    existingKeys,
    createData: (j) => j,
    updateWhere: (j) => ({ partId_month: { partId: j.partId, month: j.month } }),
    updateData: (j) => ({ usageQty: j.usageQty }),
    createMany: (data) => prisma.monthlyForecastUsage.createMany({ data, skipDuplicates: true }),
    update: (args) => prisma.monthlyForecastUsage.update(args),
  });
}

// --- SEP DS: header row 5 has real dates starting at column D, data row 6+.
// This is the true raw source for daily delivery quantities.
async function importSepDs(ws: ExcelJS.Worksheet, knownCodes: Set<string>): Promise<ImportCounts> {
  const headerRow = ws.getRow(5);
  const dateCols: { col: number; date: Date }[] = [];
  for (let col = 4; col <= 60; col++) {
    const date = toDate(cellValue(headerRow.getCell(col)));
    if (!date) break;
    dateCols.push({ col, date });
  }

  interface Row {
    code: string;
    partName: string | null;
    deliveries: { date: Date; qty: number }[];
  }
  const rows: Row[] = [];
  const lastRow = ws.rowCount;
  for (let r = 6; r <= lastRow; r++) {
    const row = ws.getRow(r);
    const code = toStr(cellValue(row.getCell("B")));
    if (!code) continue;

    const dayEntries: { date: Date; qty: number }[] = [];
    for (const dc of dateCols) {
      const qty = toNum(cellValue(row.getCell(dc.col)));
      if (qty === null) continue;
      dayEntries.push({ date: dc.date, qty });
    }
    rows.push({ code, partName: toStr(cellValue(row.getCell("C"))), deliveries: dayEntries });
  }

  const { idsByCode } = await upsertJscphParts(
    rows.map((r) => ({ code: r.code, fields: { partName: r.partName } })),
    knownCodes,
  );

  const deliveryJobs = rows.flatMap((r) =>
    r.deliveries.map((d) => ({ partId: idsByCode.get(r.code)!, ...d })),
  );
  const existingDeliveries = await prisma.dailyDeliveryQty.findMany({
    where: { partId: { in: [...idsByCode.values()] } },
    select: { partId: true, date: true },
  });
  const existingKeys = new Set(existingDeliveries.map((d) => `${d.partId}::${d.date.toISOString()}`));

  return bulkUpsertChildren({
    jobs: deliveryJobs,
    keyOf: (j) => `${j.partId}::${j.date.toISOString()}`,
    existingKeys,
    createData: (j) => j,
    updateWhere: (j) => ({ partId_date: { partId: j.partId, date: j.date } }),
    updateData: (j) => ({ qty: j.qty }),
    createMany: (data) => prisma.dailyDeliveryQty.createMany({ data, skipDuplicates: true }),
    update: (args) => prisma.dailyDeliveryQty.update(args),
  });
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

  // Shared across every sheet importer below so creation counts stay
  // accurate even when the same part is touched by more than one sheet.
  const knownCodes = new Set(
    (await prisma.jscphPart.findMany({ select: { code: true } })).map((p) => p.code),
  );

  const poPriceResult = await importPoPriceMaster(poPriceMaster, knownCodes);
  const forecastParts = await importForecastCalqIdentity(forecastCalq, knownCodes);
  const deliveryResult = await importTblDeliveryQuantity(tblDeliveryQuantity, knownCodes);
  const forecastUsage = await importSepFct(sepFct, referenceYear, knownCodes);
  const dailyDelivery = await importSepDs(sepDs, knownCodes);

  await notifyNegativeStockBatch("JSCPH", deliveryResult.newlyNegative);

  // Full "as imported" snapshots for every sheet — including ones already
  // partially captured as raw/editable fields above — so the Reports section
  // always mirrors exactly what's in the workbook, formulas (PO totals,
  // running stock projections, per-month usage/order, etc.) included, not
  // just the columns treated as raw/editable. These snapshots are already
  // bulk deleteMany+createMany internally and don't depend on each other, so
  // they run concurrently.
  const [
    tblSalesAmountCount,
    spqCheckCount,
    stockRatioResinCount,
    runningStockResinCount,
    poPriceMasterCount,
    forecastCalqCount,
    tblDeliveryQuantityCount,
    sepFctCount,
    sepDsCount,
  ] = await Promise.all([
    importComputedSheet({
      sourceFile: "JSCPH",
      sheetName: "tbl_SalesAmount",
      worksheet: tblSalesAmount,
      headerRow: 3,
      dataStartRow: 4,
      // Same identity+date+summary structure as tblDelivery_Quantity, and
      // the same "CHECK" scratch column (all leftover 0s) sits between
      // Inventory and the sheet's true trailing blanks, so a simple
      // trailing-blank scan would stop too early — locate "Inventory" by
      // name instead.
      maxCol: findHeaderColumn(tblSalesAmount, 3, "Inventory") ?? tblSalesAmount.columnCount,
    }),
    importComputedSheet({
      sourceFile: "JSCPH",
      sheetName: "SPQ_Check",
      worksheet: spqCheck,
      headerRow: 3,
      dataStartRow: 4,
      maxCol: findHeaderColumn(spqCheck, 3, "Inventory") ?? spqCheck.columnCount,
    }),
    importComputedSheet({
      sourceFile: "JSCPH",
      sheetName: "STOCK RATIO RESIN",
      worksheet: stockRatioResin,
      headerRow: 10,
      dataStartRow: 11,
      maxCol: trimTrailingBlankColumns(stockRatioResin, 10),
    }),
    importComputedSheet({
      sourceFile: "JSCPH",
      sheetName: "RUNNING STOCK (Resin)",
      worksheet: runningStockResin,
      headerRow: 2,
      dataStartRow: 4,
      maxCol: trimTrailingBlankColumns(runningStockResin, 2),
    }),
    importComputedSheet({
      sourceFile: "JSCPH",
      sheetName: "PO_Price_Master",
      worksheet: poPriceMaster,
      headerRow: 3,
      dataStartRow: 4,
      maxCol: trimTrailingBlankColumns(poPriceMaster, 3),
    }),
    importComputedSheet({
      sourceFile: "JSCPH",
      sheetName: "Forecast_CALQ",
      worksheet: forecastCalq,
      headerRow: 3,
      dataStartRow: 4,
      // Deliberately NOT trimmed — column 52 has no header label but does
      // carry real per-part figures (verified by hand against the source
      // file), unlike every other sheet's trailing columns here.
      maxCol: forecastCalq.columnCount,
    }),
    importComputedSheet({
      sourceFile: "JSCPH",
      sheetName: "tblDelivery_Quantity",
      worksheet: tblDeliveryQuantity,
      headerRow: 3,
      dataStartRow: 4,
      // The sheet's real table ends at "Inventory" — everything past that
      // (PO - DS, ES - NextMonth, Stock Ratio, SEP DS TTL, DIFF, and blank
      // spacer columns) is scratch/helper content, not part of the report.
      // Located by header text rather than a fixed column number since the
      // date column count (and so Inventory's position) shifts with the
      // number of days in the month.
      maxCol: findHeaderColumn(tblDeliveryQuantity, 3, "Inventory") ?? tblDeliveryQuantity.columnCount,
    }),
    importComputedSheet({
      sourceFile: "JSCPH",
      sheetName: "SEP FCT",
      worksheet: sepFct,
      headerRow: 2,
      dataStartRow: 3,
      maxCol: trimTrailingBlankColumns(sepFct, 2),
    }),
    importComputedSheet({
      sourceFile: "JSCPH",
      sheetName: "SEP DS",
      worksheet: sepDs,
      headerRow: 5,
      dataStartRow: 6,
      maxCol: trimTrailingBlankColumns(sepDs, 5),
    }),
  ]);

  const computedSheets: Record<string, number> = {
    tbl_SalesAmount: tblSalesAmountCount,
    SPQ_Check: spqCheckCount,
    "STOCK RATIO RESIN": stockRatioResinCount,
    "RUNNING STOCK (Resin)": runningStockResinCount,
    PO_Price_Master: poPriceMasterCount,
    Forecast_CALQ: forecastCalqCount,
    tblDelivery_Quantity: tblDeliveryQuantityCount,
    "SEP FCT": sepFctCount,
    "SEP DS": sepDsCount,
  };

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
