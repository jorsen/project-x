export type NavIconName =
  | "Boxes"
  | "PackageCheck"
  | "ClipboardList"
  | "Layers"
  | "BarChart3"
  | "Upload"
  | "Users";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
  adminOnly?: boolean;
}

export interface NavSection {
  heading: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    heading: "E-Components file",
    items: [
      { href: "/ecomp-parts", label: "Parts & Weekly Demand", icon: "Boxes" },
      { href: "/receiving-report", label: "Receiving Report", icon: "PackageCheck" },
      { href: "/open-po", label: "Open PO Lines", icon: "ClipboardList" },
    ],
  },
  {
    heading: "JSCPH file",
    items: [{ href: "/jscph-parts", label: "Parts & Schedules", icon: "Layers" }],
  },
  {
    heading: "Reference",
    items: [{ href: "/reports", label: "Computed Reports", icon: "BarChart3" }],
  },
  {
    heading: "Admin",
    items: [
      { href: "/import", label: "Import Excel", icon: "Upload" },
      { href: "/users", label: "Users", icon: "Users", adminOnly: true },
    ],
  },
];
