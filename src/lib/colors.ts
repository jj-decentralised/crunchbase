/**
 * Shared color scales for charts. Category palette is a perceptually varied set
 * that reads well on both light and dark surfaces; stage colors progress from
 * cool (early) to warm (late).
 */

export const CATEGORY_PALETTE = [
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#ec4899", // pink
  "#22c55e", // green
  "#3b82f6", // blue
  "#a855f7", // purple
  "#ef4444", // red
  "#06b6d4", // cyan
  "#eab308", // yellow
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#f97316", // orange
  "#0ea5e9", // sky
  "#d946ef", // fuchsia
  "#84cc16", // lime
];

export const OTHER_COLOR = "#94a3b8"; // slate-400

export const STAGE_COLORS: Record<string, string> = {
  "Pre-Seed & Seed": "#22c55e",
  "Early (A/B)": "#3b82f6",
  "Growth (C+)": "#a855f7",
  "Late & PE": "#f59e0b",
  "Debt & Other": "#94a3b8",
};

/** Stable color for a series name given its index in an ordered list. */
export function colorForIndex(index: number, name?: string): string {
  if (name === "Other") return OTHER_COLOR;
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
}

/** Map a list of names to a stable color lookup. */
export function buildColorMap(names: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  let i = 0;
  for (const name of names) {
    if (name === "Other") {
      map[name] = OTHER_COLOR;
    } else {
      map[name] = CATEGORY_PALETTE[i % CATEGORY_PALETTE.length];
      i++;
    }
  }
  return map;
}
