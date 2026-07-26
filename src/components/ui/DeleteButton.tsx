"use client";

import { Trash2 } from "lucide-react";

export function DeleteButton({
  action,
  confirmText = "Delete this record? This cannot be undone.",
  label = "Delete",
  iconOnly = false,
}: {
  action: () => Promise<void>;
  confirmText?: string;
  label?: string;
  iconOnly?: boolean;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        title={label}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {!iconOnly && label}
      </button>
    </form>
  );
}
