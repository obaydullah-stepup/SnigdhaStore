import { ProductGridSkeleton } from "@/components/product/product-grid-skeleton";

export default function CategoryLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-10">
      <div className="bg-muted h-5 w-64 animate-pulse rounded" />
      <div className="bg-muted mt-4 h-48 w-full animate-pulse rounded-2xl" />
      <div className="mt-8">
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}
