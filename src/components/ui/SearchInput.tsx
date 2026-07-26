import { Search } from "lucide-react";

export function SearchInput({
  defaultValue,
  placeholder,
}: {
  defaultValue?: string;
  placeholder: string;
}) {
  return (
    <div className="relative max-w-md flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        name="q"
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  );
}
