"use client";

import { useRouter } from "next/navigation";
import { ResponsiveContainer, Treemap, Tooltip } from "recharts";
import { CATEGORY_PALETTE } from "@/lib/colors";
import { formatUsdCompact } from "@/lib/utils";

interface Node {
  id: string;
  name: string;
  total: number;
  rounds: number;
}

export function CategoryTreemap({
  nodes,
  height = 360,
  hrefFor,
}: {
  nodes: Node[];
  height?: number;
  hrefFor?: (id: string) => string;
}) {
  const router = useRouter();
  const data = nodes
    .filter((n) => n.total > 0)
    .map((n, i) => ({
      name: n.name,
      size: n.total,
      rounds: n.rounds,
      id: n.id,
      fill: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
    }));

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <Treemap
          data={data}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="hsl(var(--surface))"
          isAnimationActive={false}
          content={
            <TreemapCell
              onClick={(id) => hrefFor && router.push(hrefFor(id))}
              clickable={Boolean(hrefFor)}
            />
          }
        >
          <Tooltip content={<TreemapTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

interface CellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  fill?: string;
  id?: string;
  size?: number;
  onClick?: (id: string) => void;
  clickable?: boolean;
}

function TreemapCell(props: CellProps) {
  const { x = 0, y = 0, width = 0, height = 0, name, fill, id, onClick, clickable } = props;
  const showLabel = width > 64 && height > 30;
  return (
    <g
      onClick={() => id && onClick?.(id)}
      style={{ cursor: clickable ? "pointer" : "default" }}
    >
      <rect x={x} y={y} width={width} height={height} fill={fill} fillOpacity={0.9} rx={3} />
      {showLabel && (
        <text x={x + 8} y={y + 20} fill="#fff" fontSize={12} fontWeight={600}>
          {truncate(name ?? "", Math.floor(width / 8))}
        </text>
      )}
      {showLabel && height > 46 && (
        <text x={x + 8} y={y + 36} fill="#ffffffcc" fontSize={11}>
          {formatUsdCompact(props.size ?? 0)}
        </text>
      )}
    </g>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, Math.max(1, n - 1))}…` : s;
}

interface TipPayload { payload?: { name?: string; size?: number; rounds?: number } }
function TreemapTooltip({ active, payload }: { active?: boolean; payload?: TipPayload[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (!d) return null;
  return (
    <div className="rounded-lg border border-border bg-surface/95 p-3 text-xs shadow-xl backdrop-blur">
      <div className="font-semibold text-foreground">{d.name}</div>
      <div className="mt-1 flex gap-3 text-muted">
        <span className="tabular text-foreground">{formatUsdCompact(d.size ?? 0)}</span>
        <span>{d.rounds} rounds</span>
      </div>
    </div>
  );
}
