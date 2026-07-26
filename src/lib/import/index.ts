import { prisma } from "@/lib/prisma";
import { readWorkbook } from "./utils";
import { importEcompWorkbook } from "./ecomp";
import { importJscphWorkbook } from "./jscph";

export type SourceFile = "ECOMP" | "JSCPH";

export async function runImport(sourceFile: SourceFile, fileName: string, buffer: Buffer) {
  const workbook = await readWorkbook(buffer);

  const summary =
    sourceFile === "ECOMP"
      ? { entities: await importEcompWorkbook(workbook), computedSheets: {} as Record<string, number> }
      : await importJscphWorkbook(workbook, new Date().getFullYear());

  await prisma.importRun.create({
    data: {
      sourceFile,
      fileName,
      summary: summary as never,
    },
  });

  return summary;
}
