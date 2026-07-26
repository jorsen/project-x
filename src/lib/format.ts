export function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function parseDateInput(value: FormDataEntryValue | null): Date | null {
  const str = typeof value === "string" ? value.trim() : "";
  if (!str) return null;
  const date = new Date(`${str}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseNumberInput(value: FormDataEntryValue | null): number | null {
  const str = typeof value === "string" ? value.trim() : "";
  if (!str) return null;
  const num = Number(str);
  return Number.isNaN(num) ? null : num;
}

export function parseIntInput(value: FormDataEntryValue | null): number | null {
  const str = typeof value === "string" ? value.trim() : "";
  if (!str) return null;
  const num = Number.parseInt(str, 10);
  return Number.isNaN(num) ? null : num;
}

export function parseTextInput(value: FormDataEntryValue | null): string | null {
  const str = typeof value === "string" ? value.trim() : "";
  return str || null;
}
