-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EcompPart" (
    "id" TEXT NOT NULL,
    "no" TEXT,
    "partNumber" TEXT,
    "category" TEXT,
    "ics" TEXT NOT NULL,
    "maker" TEXT,
    "inventoryQty" DOUBLE PRECISION,
    "inventoryAsOf" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EcompPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EcompCustomerDemand" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "customerCode" TEXT NOT NULL,
    "qty" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EcompCustomerDemand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivingRecord" (
    "id" TEXT NOT NULL,
    "no" INTEGER NOT NULL,
    "ics" TEXT NOT NULL,
    "partName" TEXT,
    "supplier" TEXT,
    "maker" TEXT,
    "commodity" TEXT,
    "price" DOUBLE PRECISION,
    "poNumber" TEXT,
    "etd" TIMESTAMP(3),
    "eta" TIMESTAMP(3),
    "qty" DOUBLE PRECISION,
    "inTransit" DOUBLE PRECISION,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceivingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenPoLine" (
    "id" TEXT NOT NULL,
    "sourceSheet" TEXT NOT NULL,
    "no" TEXT,
    "partNumber" TEXT,
    "category" TEXT,
    "ics" TEXT NOT NULL,
    "maker" TEXT,
    "unitPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpenPoLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenPoCustomerDemand" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "customerCode" TEXT NOT NULL,
    "qty" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpenPoCustomerDemand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JscphPart" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "ics1" TEXT,
    "partName" TEXT,
    "modelName" TEXT,
    "spq" DOUBLE PRECISION,
    "unitPricePurchase" DOUBLE PRECISION,
    "unitPriceSales" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JscphPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoPriceEntry" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "qty" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoPriceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyForecastUsage" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "usageQty" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyForecastUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyDeliveryQty" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "qty" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyDeliveryQty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyBufferOverride" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "bufferQty" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyBufferOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAdjustment" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "boh" DOUBLE PRECISION,
    "incomingA" DOUBLE PRECISION,
    "incomingB" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComputedSheetSnapshot" (
    "id" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComputedSheetSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeNumber_key" ON "User"("employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EcompPart_ics_key" ON "EcompPart"("ics");

-- CreateIndex
CREATE UNIQUE INDEX "EcompCustomerDemand_partId_customerCode_key" ON "EcompCustomerDemand"("partId", "customerCode");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivingRecord_no_key" ON "ReceivingRecord"("no");

-- CreateIndex
CREATE UNIQUE INDEX "OpenPoLine_sourceSheet_ics_key" ON "OpenPoLine"("sourceSheet", "ics");

-- CreateIndex
CREATE UNIQUE INDEX "OpenPoCustomerDemand_lineId_customerCode_key" ON "OpenPoCustomerDemand"("lineId", "customerCode");

-- CreateIndex
CREATE UNIQUE INDEX "JscphPart_code_key" ON "JscphPart"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PoPriceEntry_partId_poNumber_key" ON "PoPriceEntry"("partId", "poNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyForecastUsage_partId_month_key" ON "MonthlyForecastUsage"("partId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "DailyDeliveryQty_partId_date_key" ON "DailyDeliveryQty"("partId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyBufferOverride_partId_month_key" ON "MonthlyBufferOverride"("partId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryAdjustment_partId_key" ON "DeliveryAdjustment"("partId");

-- CreateIndex
CREATE INDEX "ComputedSheetSnapshot_sourceFile_sheetName_idx" ON "ComputedSheetSnapshot"("sourceFile", "sheetName");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "EcompCustomerDemand" ADD CONSTRAINT "EcompCustomerDemand_partId_fkey" FOREIGN KEY ("partId") REFERENCES "EcompPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenPoCustomerDemand" ADD CONSTRAINT "OpenPoCustomerDemand_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "OpenPoLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoPriceEntry" ADD CONSTRAINT "PoPriceEntry_partId_fkey" FOREIGN KEY ("partId") REFERENCES "JscphPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyForecastUsage" ADD CONSTRAINT "MonthlyForecastUsage_partId_fkey" FOREIGN KEY ("partId") REFERENCES "JscphPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyDeliveryQty" ADD CONSTRAINT "DailyDeliveryQty_partId_fkey" FOREIGN KEY ("partId") REFERENCES "JscphPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyBufferOverride" ADD CONSTRAINT "MonthlyBufferOverride_partId_fkey" FOREIGN KEY ("partId") REFERENCES "JscphPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAdjustment" ADD CONSTRAINT "DeliveryAdjustment_partId_fkey" FOREIGN KEY ("partId") REFERENCES "JscphPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

