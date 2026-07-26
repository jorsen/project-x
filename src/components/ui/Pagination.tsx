import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE = 50;

export function parseSkip(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function buildHref(basePath: string, params: Record<string, string | undefined>, skip: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "skip") continue;
    if (value) search.set(key, value);
  }
  if (skip > 0) search.set("skip", String(skip));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({
  basePath,
  searchParams,
  skip,
  count,
  total,
}: {
  basePath: string;
  searchParams: Record<string, string | undefined>;
  skip: number;
  count: number;
  total: number;
}) {
  if (total <= PAGE_SIZE && skip === 0) return null;

  const from = total === 0 ? 0 : skip + 1;
  const to = skip + count;
  const hasPrev = skip > 0;
  const hasNext = to < total;

  return (
    <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
      <p>
        Showing <span className="font-medium text-slate-700">{from}</span>–
        <span className="font-medium text-slate-700">{to}</span> of{" "}
        <span className="font-medium text-slate-700">{total}</span>
      </p>
      <div className="flex gap-2">
        <Link
          href={buildHref(basePath, searchParams, Math.max(0, skip - PAGE_SIZE))}
          aria-disabled={!hasPrev}
          className={`inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-medium ${
            hasPrev ? "text-slate-700 hover:bg-slate-50" : "pointer-events-none text-slate-300"
          }`}
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </Link>
        <Link
          href={buildHref(basePath, searchParams, skip + PAGE_SIZE)}
          aria-disabled={!hasNext}
          className={`inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-medium ${
            hasNext ? "text-slate-700 hover:bg-slate-50" : "pointer-events-none text-slate-300"
          }`}
        >
          Next <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
