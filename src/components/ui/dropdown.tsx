"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export function Dropdown({
  label,
  badge,
  children,
  align = "left",
  className,
}: {
  label: ReactNode;
  badge?: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-2",
          open && "ring-2 ring-ring/50",
        )}
      >
        <span className="max-w-[12rem] truncate">{label}</span>
        {badge}
        <ChevronDown className="h-3.5 w-3.5 text-muted" />
      </button>
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 min-w-[15rem] rounded-lg border border-border bg-surface p-1.5 shadow-xl animate-fade-in",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
