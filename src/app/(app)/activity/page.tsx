import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { ActivityFeed, type ActivityLogItem } from "@/components/ActivityFeed";

function LiveIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      Live — updates automatically
    </span>
  );
}

export default async function ActivityPage() {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const initialLogs: ActivityLogItem[] = logs.map((log) => ({
    id: log.id,
    userName: log.userName,
    action: log.action,
    entityType: log.entityType,
    entityLabel: log.entityLabel,
    createdAt: log.createdAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader title="Activity Log" description={<LiveIndicator />} />
      <ActivityFeed initialLogs={initialLogs} />
    </div>
  );
}
