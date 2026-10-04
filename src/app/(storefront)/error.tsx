"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StorefrontError({
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
    <div className="bg-background text-foreground flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="bg-destructive/10 mx-auto mb-4 flex size-14 items-center justify-center rounded-full">
          <AlertTriangle className="text-destructive size-6" aria-hidden="true" />
        </div>
        <p className="text-muted-foreground text-sm font-medium">Error</p>
        <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="text-muted-foreground/70 mt-1 font-mono text-xs">
            {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button size="sm" onClick={() => reset()}>
            <span className="sr-only">Retry loading this page</span>
            Try again
          </Button>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
