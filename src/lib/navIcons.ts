import {
  Boxes,
  PackageCheck,
  ClipboardList,
  Layers,
  BarChart3,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { NavIconName } from "./nav";

// Components (functions) can't be passed as props from a Server Component to
// a Client Component — React can't serialize them across that boundary. This
// map lets both sides resolve the same icon from a plain string name instead.
export const navIcons: Record<NavIconName, LucideIcon> = {
  Boxes,
  PackageCheck,
  ClipboardList,
  Layers,
  BarChart3,
  Upload,
  Users,
};
