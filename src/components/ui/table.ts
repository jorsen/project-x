// Shared className constants for plain <table> markup, so every list/detail
// table in the app looks and behaves the same without a generic <Table>
// abstraction (columns/cells differ too much per page for that to help).
export const tableWrap = "overflow-hidden overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm";
export const table = "min-w-full divide-y divide-slate-200 text-sm";
export const thead = "bg-slate-50";
export const th = "px-4 py-2.5 whitespace-nowrap text-left text-xs font-semibold tracking-wide text-slate-500 uppercase";
export const thNum = `${th} text-right`;
export const tbody = "divide-y divide-slate-100 bg-white";
export const tr = "transition-colors hover:bg-slate-50";
export const td = "px-4 py-2.5 whitespace-nowrap text-slate-700";
export const tdNum = `${td} text-right tabular-nums`;
export const tdMuted = `${td} text-slate-400`;
export const tdActions = "px-4 py-2.5 whitespace-nowrap text-right";
