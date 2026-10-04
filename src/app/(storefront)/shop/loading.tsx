import { ProductGridSkeleton } from "@/components/product/product-grid-skeleton";

export default function ShopLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-10">
      <div className="bg-muted h-6 w-24 animate-pulse rounded" />
      <div className="bg-muted mt-3 h-9 w-64 animate-pulse rounded" />
      <div className="mt-6 flex items-center justify-between">
        <div className="bg-muted h-4 w-40 animate-pulse rounded" />
        <div className="bg-muted h-9 w-40 animate-pulse rounded" />
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="flex flex-col gap-6">
            <div className="bg-muted h-4 w-16 animate-pulse rounded" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-muted h-8 w-full animate-pulse rounded" />
            ))}
          </div>
        </aside>
        <ProductGridSkeleton count={12} />
      </div>
    </div>
  );
}
