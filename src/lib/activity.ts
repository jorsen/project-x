import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export type ActivityAction = "CREATE" | "UPDATE" | "DELETE" | "IMPORT";
export type ActivityChanges = Record<string, { from: unknown; to: unknown }>;

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value ?? null;
}

/**
 * Compares `before` and `after` field-by-field (restricted to `fields`) and
 * returns only the ones that actually differ, as `{ field: { from, to } }`.
 * Pass `before: null` for a create (everything shows as newly "to"), or
 * `after: null` for a delete (everything shows as removed "from").
 * Returns null if nothing differs (e.g. a no-op update) so callers can skip
 * writing an empty diff.
 */
export function diffFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  fields: string[],
): ActivityChanges | null {
  const changes: ActivityChanges = {};
  for (const field of fields) {
    const from = before ? normalize(before[field]) : null;
    const to = after ? normalize(after[field]) : null;
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes[field] = { from, to };
    }
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Records one row in the activity feed. Reads the current session itself
 * (cheap — a JWT decode, no DB round trip) so call sites don't need to wire
 * a session through. Never throws — a failed log write shouldn't take down
 * the mutation it's describing.
 */
export async function logActivity(opts: {
  action: ActivityAction;
  entityType: string;
  entityLabel?: string | null;
  changes?: ActivityChanges | null;
}) {
  try {
    const session = await auth();
    await prisma.activityLog.create({
      data: {
        userId: session?.user?.id ?? null,
        userName: session?.user?.name ?? session?.user?.employeeNumber ?? "Unknown",
        action: opts.action,
        entityType: opts.entityType,
        entityLabel: opts.entityLabel ?? null,
        changes: (opts.changes ?? undefined) as never,
      },
    });
  } catch (err) {
    console.error("Failed to record activity log:", err);
  }
}
