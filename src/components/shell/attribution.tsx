import { cn } from "@/lib/utils";

/**
 * Required Crunchbase attribution. Rendered on every data surface.
 */
export function Attribution({ className }: { className?: string }) {
  return (
    <p className={cn("text-[11px] text-muted-2", className)}>
      Powered by{" "}
      <a
        href="https://www.crunchbase.com"
        target="_blank"
        rel="noreferrer"
        className="font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
      >
        Crunchbase
      </a>
      . Figures are aggregated estimates for research and may differ from
      official sources.
    </p>
  );
}
