"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Upload, type LucideIcon } from "lucide-react";

export interface ActivityLogItem {
  id: string;
  userName: string;
  action: string;
  entityType: string;
  entityLabel: string | null;
  createdAt: string;
}

const POLL_MS = 4000;
const MAX_ITEMS = 100;

const actionConfig: Record<string, { icon: LucideIcon; tone: string; verb: string }> = {
  CREATE: { icon: Plus, tone: "text-emerald-600 bg-emerald-50", verb: "created" },
  UPDATE: { icon: Pencil, tone: "text-indigo-600 bg-indigo-50", verb: "updated" },
  DELETE: { icon: Trash2, tone: "text-red-600 bg-red-50", verb: "deleted" },
  IMPORT: { icon: Upload, tone: "text-amber-600 bg-amber-50", verb: "imported" },
};

function relativeTime(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function ActivityFeed({ initialLogs }: { initialLogs: ActivityLogItem[] }) {
  const [logs, setLogs] = useState(initialLogs);
  const [, forceTick] = useState(0);
  const latestSeenRef = useRef(initialLogs[0]?.createdAt ?? null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const url = latestSeenRef.current
          ? `/api/activity?since=${encodeURIComponent(latestSeenRef.current)}`
          : "/api/activity";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        if (!res.headers.get("content-type")?.includes("application/json")) return;

        const data: { logs?: ActivityLogItem[] } = await res.json();
        if (cancelled || !data.logs?.length) return;

        latestSeenRef.current = data.logs[0].createdAt;
        setLogs((prev) => {
          const seen = new Set<string>();
          return [...data.logs!, ...prev]
            .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
            .slice(0, MAX_ITEMS);
        });
      } catch {
        // Network hiccup — just try again on the next tick.
      }
    }

    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Keep "2m ago"-style labels fresh without waiting for new activity.
  useEffect(() => {
    const tick = setInterval(() => forceTick((n) => n + 1), 15000);
    return () => clearInterval(tick);
  }, []);

  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        No activity yet — actions taken across the app will show up here.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white shadow-sm">
      {logs.map((log) => {
        const config = actionConfig[log.action] ?? actionConfig.UPDATE;
        const Icon = config.icon;
        return (
          <div key={log.id} className="flex items-start gap-3 px-4 py-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.tone}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-800">
                <span className="font-medium">{log.userName}</span> {config.verb}{" "}
                <span className="font-medium">{log.entityType}</span>
                {log.entityLabel && <span className="text-slate-500"> — {log.entityLabel}</span>}
              </p>
              <p className="text-xs text-slate-400">{relativeTime(log.createdAt)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
