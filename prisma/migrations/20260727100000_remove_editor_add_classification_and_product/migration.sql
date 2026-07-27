-- Remove EDITOR from the Role enum (Postgres has no ALTER TYPE ... DROP VALUE,
-- so recreate the type and repoint the column).
ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VIEWER');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'VIEWER';
DROP TYPE "Role_old";

-- Rename JscphPart.ics1 -> classification (it only ever held the sheet's
-- 3-value "CODE" classification (IP/R/EC), never a real ICS identifier).
ALTER TABLE "JscphPart" RENAME COLUMN "ics1" TO "classification";

-- New standalone Product table for the "Additional Options" page.
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "no" SERIAL NOT NULL,
    "ics" TEXT,
    "materialName" TEXT,
    "partNumber" TEXT,
    "category" TEXT,
    "spq" DOUBLE PRECISION,
    "unitPrice" DOUBLE PRECISION,
    "oldUnitPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Product_no_key" ON "Product"("no");
