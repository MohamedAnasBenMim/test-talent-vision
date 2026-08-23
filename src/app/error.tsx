"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error caught by root error.tsx:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full p-6 text-center rounded-xl border border-border/70 bg-card shadow-xl space-y-4">
        <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangleIcon className="size-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Something went wrong!</h2>
        <p className="text-sm text-muted-foreground break-words">
          {error.message || "An unexpected error occurred while loading this page."}
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Button onClick={() => reset()} variant="default">
            Try again
          </Button>
          <Button onClick={() => window.location.assign("/")} variant="outline">
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
