export const navSections = [
  {
    heading: "E-Components file",
    items: [
      { href: "/ecomp-parts", label: "Parts & Weekly Demand" },
      { href: "/receiving-report", label: "Receiving Report" },
      { href: "/open-po", label: "Open PO Lines" },
    ],
  },
  {
    heading: "JSCPH file",
    items: [{ href: "/jscph-parts", label: "Parts & Schedules" }],
  },
  {
    heading: "Reference",
    items: [{ href: "/reports", label: "Computed Reports" }],
  },
  {
    heading: "Admin",
    items: [
      { href: "/import", label: "Import Excel" },
      { href: "/users", label: "Users", adminOnly: true },
    ],
  },
];
