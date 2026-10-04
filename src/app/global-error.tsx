"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
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
    <html lang="en">
      <body className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="bg-destructive/10 mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
            <AlertTriangle className="text-destructive size-6" aria-hidden="true" />
          </div>
          <h1 className="font-heading text-xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            An unexpected error occurred. Please try again.
          </p>
          {error.digest && (
            <p className="text-muted-foreground/70 mt-1 font-mono text-xs">
              {error.digest}
            </p>
          )}
          <button
            className="focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
            onClick={reset}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
