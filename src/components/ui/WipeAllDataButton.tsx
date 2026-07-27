"use client";

import { useState } from "react";
import { Button } from "./Button";

const CONFIRM_PHRASE = "DELETE ALL DATA";

// A plain confirm() dialog (DeleteButton's pattern) is one click away from
// firing by accident — fine for deleting a single row, not for wiping every
// table in the database. Requiring the exact phrase makes this a deliberate,
// typed action instead.
export function WipeAllDataButton({ action }: { action: () => Promise<void> }) {
  const [confirmText, setConfirmText] = useState("");
  const ready = confirmText === CONFIRM_PHRASE;

  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm text-slate-700">
        Type{" "}
        <span className="rounded bg-red-100 px-1 py-0.5 font-mono font-semibold text-red-700">
          {CONFIRM_PHRASE}
        </span>{" "}
        to enable the button below.
      </label>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={CONFIRM_PHRASE}
        autoComplete="off"
        className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
      />
      <div>
        <Button
          type="submit"
          variant="danger"
          disabled={!ready}
          className="border border-red-200"
        >
          Delete all data except users
        </Button>
      </div>
    </form>
  );
}
