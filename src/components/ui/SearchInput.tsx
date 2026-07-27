"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Loader2 } from "lucide-react";

const DEBOUNCE_MS = 300;

export function SearchInput({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const urlQuery = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlQuery);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the last value *this input* pushed to the URL, so the sync effect
  // below can tell "the URL changed because our own debounced update landed"
  // (ignore — `value` is already newer) apart from "the URL changed for some
  // other reason, like back/forward or a Pagination link" (do sync). Without
  // this, a debounced update resolving while the user keeps typing would
  // snap the field back to the stale value mid-keystroke, which is what
  // made typing feel laggy/broken.
  const lastPushedRef = useRef(urlQuery);

  useEffect(() => {
    if (urlQuery !== lastPushedRef.current) {
      setValue(urlQuery);
      lastPushedRef.current = urlQuery;
    }
  }, [urlQuery]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set("q", next);
      else params.delete("q");
      // A new search invalidates the old page's offset.
      params.delete("skip");

      lastPushedRef.current = next;
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    }, DEBOUNCE_MS);
  }

  return (
    <div className="relative max-w-md flex-1">
      {isPending ? (
        <Loader2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
      ) : (
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
      )}
      <input
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  );
}
