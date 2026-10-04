import Link from "next/link";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { ReviewRowActions } from "@/components/admin/review-row-actions";

export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireStaff();
  const sp = await searchParams;
  const filter = sp.filter === "approved" || sp.filter === "pending" ? sp.filter : "all";

  const reviews = await prisma.review.findMany({
    where: filter === "all" ? {} : { isApproved: filter === "approved" },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      product: { select: { name: true, slug: true } },
    },
  });

  const FILTERS = [
    { value: "all", label: "All", count: null },
    {
      value: "pending",
      label: "Pending",
      count: reviews.filter((r) => !r.isApproved).length,
    },
    {
      value: "approved",
      label: "Approved",
      count: reviews.filter((r) => r.isApproved).length,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Reviews" }]} />
        <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
          Reviews
        </h1>
      </div>

      <div className="flex gap-1">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={
              filter === "all" && f.value === "all"
                ? "/admin/reviews"
                : `/admin/reviews?filter=${f.value}`
            }
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {f.label}
            {f.count !== null ? ` (${f.count})` : ""}
          </Link>
        ))}
      </div>

      {reviews.length === 0 ? (
        <div className="border-border flex items-center justify-center rounded-xl border border-dashed px-6 py-16">
          <p className="text-muted-foreground text-sm">No reviews here yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {reviews.map((r) => (
            <li key={r.id} className="border-border bg-card rounded-xl border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="border-border bg-muted flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold">
                    {r.user.name?.charAt(0) ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{r.user.name}</p>
                    <p className="text-muted-foreground text-xs">{r.user.email}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs">
                      <span className="text-amber-500">{"★".repeat(r.rating)}</span>
                      <span className="text-muted-foreground">{r.rating}/5</span>
                      {!r.isApproved && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ReviewRowActions id={r.id} approved={r.isApproved} />
              </div>
              <Link
                href={`/product/${r.product.slug}`}
                className="text-primary mt-3 block text-xs font-medium hover:underline"
              >
                On: {r.product.name}
              </Link>
              {r.title && <p className="mt-2 text-sm font-semibold">{r.title}</p>}
              <p className="text-muted-foreground mt-1 text-sm">{r.comment}</p>
              <p className="text-muted-foreground mt-2 text-[11px]">
                {r.createdAt.toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
