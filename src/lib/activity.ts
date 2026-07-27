import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export type ActivityAction = "CREATE" | "UPDATE" | "DELETE" | "IMPORT";

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
      },
    });
  } catch (err) {
    console.error("Failed to record activity log:", err);
  }
}
