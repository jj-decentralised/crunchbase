import { Badge } from "@/components/ui/badge";
import { STAGE_COLORS } from "@/lib/colors";
import { formatUsdCompact } from "@/lib/utils";

export interface DealRow {
  uuid: string;
  orgName: string;
  orgPermalink: string;
  announcedOn: string;
  investmentType: string;
  stageBucket: string;
  moneyRaisedUsd: number | null;
  numInvestors: number | null;
  countryCode: string | null;
}

function prettyType(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DealsTable({ rows }: { rows: DealRow[] }) {
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-2">No rounds match the filters.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-2">
            <th className="px-3 py-2 font-medium">Company</th>
            <th className="px-3 py-2 font-medium">Announced</th>
            <th className="px-3 py-2 font-medium">Stage</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 text-right font-medium">Raised</th>
            <th className="px-3 py-2 text-right font-medium">Investors</th>
            <th className="px-3 py-2 font-medium">Geo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.uuid}
              className="border-b border-border/60 transition-colors hover:bg-surface-2"
            >
              <td className="px-3 py-2 font-medium text-foreground">{r.orgName}</td>
              <td className="tabular px-3 py-2 text-muted">{r.announcedOn}</td>
              <td className="px-3 py-2">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: STAGE_COLORS[r.stageBucket] ?? "#94a3b8" }}
                  />
                  {r.stageBucket}
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-muted">{prettyType(r.investmentType)}</td>
              <td className="tabular px-3 py-2 text-right font-medium">
                {formatUsdCompact(r.moneyRaisedUsd)}
              </td>
              <td className="tabular px-3 py-2 text-right text-muted">{r.numInvestors ?? "—"}</td>
              <td className="px-3 py-2">
                {r.countryCode ? (
                  <Badge>{r.countryCode}</Badge>
                ) : (
                  <span className="text-muted-2">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
