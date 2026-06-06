"use client";

import { useState } from "react";
import { Check, Search } from "lucide-react";
import { Dropdown } from "./dropdown";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";

export interface Option {
  value: string;
  label: string;
}

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  searchable = true,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  searchable?: boolean;
}) {
  const [q, setQ] = useState("");
  const selectedSet = new Set(selected);
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
    : options;

  const toggle = (value: string) => {
    if (selectedSet.has(value)) onChange(selected.filter((v) => v !== value));
    else onChange([...selected, value]);
  };

  return (
    <Dropdown
      label={label}
      badge={
        selected.length > 0 ? (
          <Badge tone="primary" className="ml-0.5">
            {selected.length}
          </Badge>
        ) : null
      }
    >
      {() => (
        <div className="flex max-h-80 flex-col">
          {searchable && (
            <div className="mb-1 flex items-center gap-2 rounded-md border border-border bg-surface-2 px-2">
              <Search className="h-3.5 w-3.5 text-muted" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="h-8 w-full bg-transparent text-xs outline-none placeholder:text-muted-2"
              />
            </div>
          )}
          <div className="flex items-center justify-between px-2 py-1 text-[11px] text-muted">
            <span>{selected.length} selected</span>
            {selected.length > 0 && (
              <button
                className="hover:text-foreground"
                onClick={() => onChange([])}
              >
                Clear
              </button>
            )}
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-muted-2">
                No matches
              </p>
            )}
            {filtered.map((o) => {
              const active = selectedSet.has(o.value);
              return (
                <button
                  key={o.value}
                  onClick={() => toggle(o.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-surface-2",
                    active && "text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border-strong",
                    )}
                  >
                    {active && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{o.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Dropdown>
  );
}
