"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav";
import { useFilters } from "@/hooks/use-filters";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const { hrefWithFilters } = useFilters();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface/60 px-3 py-2 md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={hrefWithFilters(item.href)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface-2",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
