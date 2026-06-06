"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav";
import { ThemeToggle } from "./theme-toggle";
import { FreshnessBadge } from "./freshness-badge";
import { Search } from "lucide-react";

function usePageMeta() {
  const pathname = usePathname();
  if (pathname.startsWith("/categories/")) {
    return { label: "Category Detail", description: "Deep dive into a category group" };
  }
  const match =
    NAV_ITEMS.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href))) ??
    NAV_ITEMS[0];
  return { label: match.label, description: match.description };
}

export function Topbar() {
  const meta = usePageMeta();

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-surface/60 px-4 backdrop-blur md:px-6">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold tracking-tight">
          {meta.label}
        </h1>
        <p className="truncate text-[11px] text-muted">{meta.description}</p>
      </div>

      <button
        onClick={() => window.dispatchEvent(new Event("cf:open-palette"))}
        className="hidden items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-surface-2 sm:flex"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search</span>
        <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px]">
          ⌘K
        </kbd>
      </button>

      <FreshnessBadge />
      <ThemeToggle />
    </header>
  );
}
