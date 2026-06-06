"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { FilterBar, type FiltersMetaProps } from "./filter-bar";
import { CommandPalette } from "./command-palette";
import { CapabilityBanner } from "./capability-banner";

const NO_FILTER_ROUTES = ["/settings"];

export function AppShell({
  appName,
  meta,
  children,
}: {
  appName: string;
  meta: FiltersMetaProps;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const showFilters = !NO_FILTER_ROUTES.some((r) => pathname.startsWith(r));

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar appName={appName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <CapabilityBanner />
        {showFilters && (
          <div className="sticky top-0 z-30 border-b border-border bg-background/80 px-4 py-2.5 backdrop-blur md:px-6">
            <FilterBar meta={meta} />
          </div>
        )}
        <main className="flex-1 px-4 py-5 md:px-6">{children}</main>
      </div>
      <CommandPalette groups={meta.groups} />
    </div>
  );
}
