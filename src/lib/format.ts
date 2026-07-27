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

// Blank numeric input defaults to 0 (rather than null/unset) across every
// form in the app.
export function parseNumberInput(value: FormDataEntryValue | null): number {
  const str = typeof value === "string" ? value.trim() : "";
  if (!str) return 0;
  const num = Number(str);
  return Number.isNaN(num) ? 0 : num;
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

/** Rejects decimal input for fields that must count whole units (SPQ, box
 * counts). Throws rather than silently rounding, since a decimal here means
 * the source data is wrong, not that it needs cleanup. */
export function requireWholeNumber(value: number | null, label: string): number | null {
  if (value === null) return null;
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be a whole number — no decimals.`);
  }
  return value;
}
