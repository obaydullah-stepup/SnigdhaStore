import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StorefrontNotFound() {
  return (
    <div className="bg-background text-foreground flex min-h-[60vh] items-center justify-center p-6">
      <div className="text-center">
        <div className="bg-destructive/10 mx-auto mb-4 flex size-14 items-center justify-center rounded-full">
          <SearchX className="text-destructive size-6" aria-hidden="true" />
        </div>
        <p className="text-muted-foreground text-sm font-medium">404</p>
        <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to home
            </Button>
          </Link>
          <Link href="/shop">
            <Button variant="ghost" size="sm">
              <span className="sr-only">Browse all products</span>
              Browse shop
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
