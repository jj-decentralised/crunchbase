"use client";

import { ResponsiveContainer, Sankey, Tooltip, Layer, Rectangle } from "recharts";
import { CATEGORY_PALETTE, STAGE_COLORS } from "@/lib/colors";
import { formatUsdCompact } from "@/lib/utils";

interface ApiSankey {
  nodes: { id: string }[];
  links: { source: string; target: string; value: number }[];
}

export function StageCategorySankey({
  data,
  height = 420,
}: {
  data: ApiSankey;
  height?: number;
}) {
  const names = data.nodes.map((n) => n.id);
  const indexByName = new Map(names.map((n, i) => [n, i]));
  const links = data.links
    .map((l) => ({
      source: indexByName.get(l.source) ?? -1,
      target: indexByName.get(l.target) ?? -1,
      value: l.value,
    }))
    .filter((l) => l.source >= 0 && l.target >= 0 && l.value > 0);

  if (!links.length) {
    return (
      <div className="flex items-center justify-center text-sm text-muted" style={{ height }}>
        No flows for the current filters.
      </div>
    );
  }

  const colorFor = (name: string, index: number) =>
    STAGE_COLORS[name] ?? CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <Sankey
          data={{ nodes: names.map((name) => ({ name })), links }}
          nodePadding={18}
          nodeWidth={12}
          linkCurvature={0.5}
          iterations={64}
          link={{ stroke: "hsl(var(--muted))", strokeOpacity: 0.18 }}
          node={<SankeyNode colorFor={colorFor} />}
          margin={{ top: 8, bottom: 8, left: 4, right: 120 }}
        >
          <Tooltip content={<SankeyTooltip />} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}

interface NodeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  payload?: { name?: string };
  colorFor: (name: string, index: number) => string;
}

function SankeyNode({ x = 0, y = 0, width = 0, height = 0, index = 0, payload, colorFor }: NodeProps) {
  const name = payload?.name ?? "";
  const fill = colorFor(name, index);
  return (
    <Layer>
      <Rectangle x={x} y={y} width={width} height={height} fill={fill} fillOpacity={0.95} radius={2} />
      <text
        x={x + width + 8}
        y={y + height / 2}
        textAnchor="start"
        dominantBaseline="middle"
        fontSize={11}
        fill="hsl(var(--foreground))"
      >
        {name}
      </text>
    </Layer>
  );
}

interface SankeyTipPayload {
  payload?: {
    payload?: { source?: { name?: string }; target?: { name?: string }; value?: number };
  };
}
function SankeyTooltip({ active, payload }: { active?: boolean; payload?: SankeyTipPayload[] }) {
  if (!active || !payload?.length) return null;
  const link = payload[0]?.payload?.payload;
  if (!link) return null;
  if (link.source && link.target) {
    return (
      <div className="rounded-lg border border-border bg-surface/95 p-3 text-xs shadow-xl backdrop-blur">
        <div className="font-medium text-foreground">
          {link.source.name} → {link.target.name}
        </div>
        <div className="tabular mt-0.5 text-muted">{formatUsdCompact(link.value ?? 0)}</div>
      </div>
    );
  }
  return null;
}
