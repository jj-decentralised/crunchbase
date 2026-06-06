"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-negative/10 text-negative">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-sm font-semibold">Something went wrong</h2>
        <p className="mt-1 max-w-md text-xs text-muted">
          {error.message || "An unexpected error occurred while loading this view."}
        </p>
      </div>
      <Button variant="primary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
