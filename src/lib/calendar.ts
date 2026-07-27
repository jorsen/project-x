// Computed reports store one column per date (see src/lib/import/computed.ts,
// which formats date headers as ISO "YYYY-MM-DD"). This turns that shape into
// a real calendar grid + month rollup for a single row, instead of a table
// scrolling sideways through dozens of date columns.

export function isDateColumn(label: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(label);
}

const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "Wed" — matches the weekday row the source Excel prints above each date. */
export function weekdayAbbr(dateStr: string): string {
  return WEEKDAY_ABBR[weekdayOf(dateStr)];
}

export function isWeekend(dateStr: string): boolean {
  const day = weekdayOf(dateStr);
  return day === 0 || day === 6;
}

/** "7/1" — the compact month/day format the source Excel uses, instead of
 * the full "2026-07-01" stored as the column's machine-readable key. */
export function shortDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${m}/${d}`;
}

export function monthKeyOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export interface CalendarCell {
  date: string | null; // YYYY-MM-DD, null for padding outside the month
}

/** Sunday-start month grid, padded to full weeks. */
export function buildMonthGrid(monthKey: string): CalendarCell[][] {
  const [y, m] = monthKey.split("-").map(Number);
  const startWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const cells: CalendarCell[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ date: null });
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}` });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null });

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// "CODE" is deliberately excluded — in every JSCPH sheet it's a 3-value
// classification (IP/R/EC), not an identifier, so it can't distinguish rows.
const IDENTIFIER_PRIORITY = [
  "ICS1",
  "ICS",
  "ITEM NUMBER",
  "PART NAME",
  "PART NUMBER",
  "ITEM NAME",
  "MATERIAL NAME",
];

/** Best-effort human label for a report row, for the part picker — an
 * identifier plus a name where both are available (e.g. "0061950700 —
 * TPS-PN-C/T4-16-CFK/528 Screw") reads far better than either alone. */
export function rowLabel(
  data: Record<string, unknown>,
  columns: string[],
  rowIndex: number,
): string {
  const parts: string[] = [];
  for (const key of IDENTIFIER_PRIORITY) {
    if (parts.length >= 2) break;
    const match = columns.find((c) => c.toUpperCase() === key);
    if (!match) continue;
    const value = data[match];
    if (value !== null && value !== undefined && value !== "") parts.push(String(value));
  }
  return parts.length > 0 ? parts.join(" — ") : `Row ${rowIndex}`;
}
