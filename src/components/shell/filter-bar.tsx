"use client";

import { useFilters } from "@/hooks/use-filters";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ATTRIBUTION_METHODS } from "@/lib/config";
import { RotateCcw } from "lucide-react";

export interface FiltersMetaProps {
  groups: { id: string; name: string }[];
  stages: string[];
  countries: string[];
  dateRange: { min: string | null; max: string | null };
}

const SIZE_PRESETS: { label: string; value: number | null }[] = [
  { label: "Any size", value: null },
  { label: "$1M+", value: 1_000_000 },
  { label: "$10M+", value: 10_000_000 },
  { label: "$50M+", value: 50_000_000 },
  { label: "$100M+", value: 100_000_000 },
];

const ATTR_LABELS: Record<string, string> = {
  each: "Each category",
  fractional: "Fractional split",
  primary: "Primary only",
};

export function FilterBar({ meta }: { meta: FiltersMetaProps }) {
  const { filter, update, reset } = useFilters();

  const minYear = meta.dateRange.min ? Number(meta.dateRange.min.slice(0, 4)) : 2010;
  const maxYear = meta.dateRange.max ? Number(meta.dateRange.max.slice(0, 4)) : new Date().getFullYear();
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  const fromYear = filter.from ? Number(filter.from.slice(0, 4)) : minYear;
  const toYear = filter.to ? Number(filter.to.slice(0, 4)) : maxYear;

  const setFromYear = (y: number) => update({ from: `${y}-01-01` });
  const setToYear = (y: number) => update({ to: `${y}-12-31` });

  const preset = (yearsBack: number | null) => {
    if (yearsBack == null) update({ from: undefined, to: undefined });
    else {
      const to = maxYear;
      update({ from: `${to - yearsBack + 1}-01-01`, to: `${to}-12-31` });
    }
  };

  const isDirty =
    filter.from ||
    filter.to ||
    filter.categoryGroupIds.length ||
    filter.stageBuckets.length ||
    filter.countryCodes.length ||
    filter.minRoundSizeUsd != null ||
    filter.grain !== "quarter" ||
    filter.attributionMethod !== "each";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date range */}
      <div className="flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1">
        <span className="text-[11px] font-medium text-muted">From</span>
        <Select
          value={fromYear}
          onChange={(e) => setFromYear(Number(e.target.value))}
          className="h-6 border-0 bg-transparent pl-1 pr-6 hover:bg-transparent"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
        <span className="text-[11px] font-medium text-muted">to</span>
        <Select
          value={toYear}
          onChange={(e) => setToYear(Number(e.target.value))}
          className="h-6 border-0 bg-transparent pl-1 pr-6 hover:bg-transparent"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
      </div>

      <div className="flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5">
        {[
          { l: "All", v: null },
          { l: "5Y", v: 5 },
          { l: "3Y", v: 3 },
          { l: "1Y", v: 1 },
        ].map((p) => (
          <button
            key={p.l}
            onClick={() => preset(p.v)}
            className="rounded px-2 py-1 text-[11px] font-medium text-muted hover:bg-surface-2 hover:text-foreground"
          >
            {p.l}
          </button>
        ))}
      </div>

      <Select
        value={filter.grain}
        onChange={(e) => update({ grain: e.target.value as typeof filter.grain })}
        aria-label="Time grain"
      >
        <option value="month">Monthly</option>
        <option value="quarter">Quarterly</option>
        <option value="year">Yearly</option>
      </Select>

      <MultiSelect
        label="Categories"
        options={meta.groups.map((g) => ({ value: g.id, label: g.name }))}
        selected={filter.categoryGroupIds}
        onChange={(v) => update({ categoryGroupIds: v })}
      />

      <MultiSelect
        label="Stages"
        searchable={false}
        options={meta.stages.map((s) => ({ value: s, label: s }))}
        selected={filter.stageBuckets}
        onChange={(v) => update({ stageBuckets: v })}
      />

      <MultiSelect
        label="Geographies"
        options={meta.countries.map((c) => ({ value: c, label: c }))}
        selected={filter.countryCodes}
        onChange={(v) => update({ countryCodes: v })}
      />

      <Select
        value={filter.minRoundSizeUsd ?? ""}
        onChange={(e) =>
          update({ minRoundSizeUsd: e.target.value === "" ? null : Number(e.target.value) })
        }
        aria-label="Minimum round size"
      >
        {SIZE_PRESETS.map((p) => (
          <option key={p.label} value={p.value ?? ""}>{p.label}</option>
        ))}
      </Select>

      <Select
        value={filter.attributionMethod}
        onChange={(e) =>
          update({ attributionMethod: e.target.value as typeof filter.attributionMethod })
        }
        aria-label="Attribution method"
        title="How a round's capital is attributed across multiple categories"
      >
        {ATTRIBUTION_METHODS.map((m) => (
          <option key={m} value={m}>{ATTR_LABELS[m]}</option>
        ))}
      </Select>

      {isDirty && (
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
      )}
    </div>
  );
}
