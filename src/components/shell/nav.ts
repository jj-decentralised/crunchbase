import {
  LayoutDashboard,
  Waves,
  Layers,
  GitCompareArrows,
  Table2,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Overview",
    icon: LayoutDashboard,
    description: "Market KPIs and headline trends",
  },
  {
    href: "/flows",
    label: "Capital Flows",
    icon: Waves,
    description: "How dollars move across categories over time",
  },
  {
    href: "/categories",
    label: "Categories",
    icon: Layers,
    description: "Explore and drill into category groups",
  },
  {
    href: "/compare",
    label: "Compare",
    icon: GitCompareArrows,
    description: "Overlay categories side by side",
  },
  {
    href: "/deals",
    label: "Deals",
    icon: Table2,
    description: "Browse individual funding rounds",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    description: "Research universe, sync, and data controls",
  },
];
