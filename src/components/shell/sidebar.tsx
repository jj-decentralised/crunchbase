"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav";
import { useFilters } from "@/hooks/use-filters";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

export function Sidebar({ appName }: { appName: string }) {
  const pathname = usePathname();
  const { hrefWithFilters } = useFilters();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface/60 md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <TrendingUp className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">{appName}</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={hrefWithFilters(item.href)}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-primary")} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <a
          href="https://www.crunchbase.com"
          target="_blank"
          rel="noreferrer"
          className="block text-[11px] leading-relaxed text-muted-2 transition-colors hover:text-muted"
        >
          Data powered by Crunchbase. Aggregated for research; not for
          redistribution.
        </a>
      </div>
    </aside>
  );
}
