"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";

export function FlashBanner({ message }: { message?: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (!message || dismissed) return null;

  return (
    <div className="mb-4 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1">{message}</p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="rounded p-0.5 text-emerald-600 hover:bg-emerald-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
