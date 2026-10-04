import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/components/product/product-grid-skeleton";

export default function Loading() {
  return (
    <div aria-busy="true">
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:py-20 lg:grid-cols-2 lg:py-24">
          <div className="max-w-xl space-y-5">
            <Skeleton className="bg-primary-foreground/20 h-6 w-40" />
            <Skeleton className="bg-primary-foreground/20 h-12 w-full" />
            <Skeleton className="bg-primary-foreground/20 h-12 w-3/4" />
            <Skeleton className="bg-primary-foreground/20 h-5 w-1/2" />
            <div className="flex gap-3 pt-3">
              <Skeleton className="bg-primary-foreground/20 h-12 w-32" />
              <Skeleton className="bg-primary-foreground/20 h-12 w-40" />
            </div>
          </div>
          <Skeleton className="bg-primary-foreground/15 hidden aspect-[4/5] w-full max-w-md rounded-xl lg:block" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:py-16">
        <Skeleton className="h-8 w-56" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
          ))}
        </div>
        <div className="mt-16">
          <ProductGridSkeleton count={8} />
        </div>
      </div>
    </div>
  );
}
