import { requireStaff } from "@/lib/auth/guards";
import { getAdminCategories } from "@/lib/data/admin/products";
import { getCachedStoreName } from "@/lib/settings";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireStaff();
  const [categories, storeName] = await Promise.all([
    getAdminCategories(),
    getCachedStoreName(),
  ]);

  return (
    <div className="max-w-3xl">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Products", href: "/admin/products" },
          { label: "New" },
        ]}
      />
      <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
        New product
      </h1>
      <div className="mt-6">
        <ProductForm
          categories={categories}
          siteName={storeName}
          urlSuffix="/product/your-slug"
        />
      </div>
    </div>
  );
}
