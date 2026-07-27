-- jsonb doesn't preserve object key order; plain json does (it stores the
-- original text verbatim). Report columns need to stay in the sheet's
-- original left-to-right order, so switch this column's storage type.
-- Note: this only fixes ordering for rows written *after* this migration —
-- existing jsonb rows already lost their original key order on insert and
-- re-serializing them as json here cannot recover it. A re-import is needed
-- to get correctly ordered data into already-imported reports.
ALTER TABLE "ComputedSheetSnapshot" ALTER COLUMN "data" TYPE json USING "data"::json;
