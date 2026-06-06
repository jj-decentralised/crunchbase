"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NAV_ITEMS } from "./nav";
import { useFilters } from "@/hooks/use-filters";
import { Layers, Search, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  label: string;
  hint: string;
  run: () => void;
}

export function CommandPalette({
  groups,
}: {
  groups: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { hrefWithFilters } = useFilters();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("cf:open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("cf:open-palette", onOpen);
    };
  }, []);

  const items = useMemo<Item[]>(() => {
    const nav: Item[] = NAV_ITEMS.map((n) => ({
      id: `nav:${n.href}`,
      label: n.label,
      hint: n.description,
      run: () => router.push(hrefWithFilters(n.href)),
    }));
    const cats: Item[] = groups.map((g) => ({
      id: `cat:${g.id}`,
      label: g.name,
      hint: "Open category",
      run: () => router.push(hrefWithFilters(`/categories/${g.id}`)),
    }));
    return [...nav, ...cats];
  }, [groups, router, hrefWithFilters]);

  const filtered = useMemo(() => {
    if (!q) return items;
    const lower = q.toLowerCase();
    const initials = (s: string) =>
      s
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .toLowerCase();
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(lower) ||
        i.hint.toLowerCase().includes(lower) ||
        initials(i.label).includes(lower), // e.g. "AI" -> Artificial Intelligence
    );
  }, [items, q]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && filtered[active]) {
                filtered[active].run();
                setOpen(false);
              }
            }}
            placeholder="Search categories and views…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-2"
          />
          <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-2">
              No results
            </p>
          )}
          {filtered.map((item, i) => {
            const isCat = item.id.startsWith("cat:");
            return (
              <button
                key={item.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  item.run();
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm",
                  i === active ? "bg-primary/10 text-foreground" : "text-muted",
                )}
              >
                <Layers className={cn("h-4 w-4", isCat ? "text-accent" : "text-primary")} />
                <span className="flex-1">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="ml-2 text-xs text-muted-2">{item.hint}</span>
                </span>
                {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-muted" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
