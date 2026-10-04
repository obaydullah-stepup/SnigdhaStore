import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { getAdminCategories, getAdminProduct } from "@/lib/data/admin/products";
import { getCachedStoreName } from "@/lib/settings";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { ProductForm } from "@/components/admin/product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const [product, categories, storeName] = await Promise.all([
    getAdminProduct(id),
    getAdminCategories(),
    getCachedStoreName(),
  ]);
  if (!product) notFound();

  return (
    <div className="max-w-3xl">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Products", href: "/admin/products" },
          { label: product.name },
        ]}
      />
      <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
        {product.name}
      </h1>
      <div className="mt-6">
        <ProductForm
          key={product.updatedAt.toISOString()}
          productId={product.id}
          categories={categories}
          siteName={storeName}
          urlSuffix={`/product/${product.slug}`}
          initial={{
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            shortDescription: product.shortDescription,
            description: product.description,
            brand: product.brand,
            categoryId: product.categoryId,
            price: product.price,
            compareAtPrice: product.compareAtPrice,
            costPrice: product.costPrice,
            stock: product.stock,
            featured: product.featured,
            published: product.published,
            status: product.status,
            seoTitle: product.seoTitle,
            seoDescription: product.seoDescription,
            images: product.images,
            variants: product.variants.map((v) => ({
              id: v.id,
              name: v.name,
              sku: v.sku,
              price: v.price,
              stock: v.stock,
              attributes:
                v.attributes && typeof v.attributes === "object"
                  ? (v.attributes as Record<string, string>)
                  : {},
            })),
          }}
        />
      </div>
    </div>
  );
}
