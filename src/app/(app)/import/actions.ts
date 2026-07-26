"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/authz";
import { runImport, type SourceFile } from "@/lib/import";

export interface ImportActionState {
  error: string | null;
  summary: Awaited<ReturnType<typeof runImport>> | null;
  fileName: string | null;
}

export async function importExcelAction(
  _prevState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  await requireEditor();

  const sourceFile = formData.get("sourceFile") as SourceFile | null;
  const file = formData.get("file") as File | null;

  if (!sourceFile || (sourceFile !== "ECOMP" && sourceFile !== "JSCPH")) {
    return { error: "Choose which workbook this file is.", summary: null, fileName: null };
  }
  if (!file || file.size === 0) {
    return { error: "Choose an .xlsx file to upload.", summary: null, fileName: null };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const summary = await runImport(sourceFile, file.name, buffer);
    revalidatePath("/reports");
    revalidatePath("/ecomp-parts");
    revalidatePath("/receiving-report");
    revalidatePath("/open-po");
    revalidatePath("/jscph-parts");
    return { error: null, summary, fileName: file.name };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Import failed.",
      summary: null,
      fileName: null,
    };
  }
}
