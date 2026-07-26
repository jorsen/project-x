"use client";

export function DeleteButton({
  action,
  confirmText = "Delete this record? This cannot be undone.",
}: {
  action: () => Promise<void>;
  confirmText?: string;
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
        className="text-red-600 hover:text-red-800 text-sm font-medium"
      >
        Delete
      </button>
    </form>
  );
}
