type Tone = "gray" | "indigo" | "green" | "amber" | "red" | "blue" | "purple";

const tones: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-700",
  indigo: "bg-indigo-50 text-indigo-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-blue-50 text-blue-700",
  purple: "bg-purple-50 text-purple-700",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

const roleTones: Record<string, Tone> = { ADMIN: "purple", VIEWER: "gray" };

export function RoleBadge({ role }: { role: string }) {
  return <Badge tone={roleTones[role] ?? "gray"}>{role}</Badge>;
}

const sourceSheetTones: Record<string, Tone> = { SUPPLIER: "blue", AMOUNT: "green" };

export function SourceSheetBadge({ sourceSheet }: { sourceSheet: string }) {
  return <Badge tone={sourceSheetTones[sourceSheet] ?? "gray"}>{sourceSheet}</Badge>;
}
