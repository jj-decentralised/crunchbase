import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("skeleton rounded-md", className)}
      {...props}
    />
  );
}
