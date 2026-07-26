export function Field({
  name,
  label,
  type = "text",
  defaultValue,
  required,
  step,
  description,
}: {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "email" | "month" | "password";
  defaultValue?: string | number | null;
  required?: boolean;
  step?: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition-shadow placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      {description && <p className="text-xs text-slate-500">{description}</p>}
    </div>
  );
}
