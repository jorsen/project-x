// JSCPH parts carry a 3-value classification code (the source sheets label
// this column "CODE") — fixed set, not derived from data like Category.
export const CLASSIFICATIONS = ["IP", "R", "EC"] as const;

export const CLASSIFICATION_OPTIONS = [
  { value: "", label: "— None —" },
  ...CLASSIFICATIONS.map((c) => ({ value: c, label: c })),
];
