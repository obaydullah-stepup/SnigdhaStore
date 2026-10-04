import { describe, expect, it } from "vitest";
import { planImageReconcile } from "@/lib/admin/images-reconcile";

const A = {
  id: "img-A",
  url: "https://yoljlsvbmmjebmwelifp.supabase.co/storage/v1/object/public/snigdha/products/a.jpg",
};
const B = {
  id: "img-B",
  url: "https://yoljlsvbmmjebmwelifp.supabase.co/storage/v1/object/public/snigdha/products/b.jpg",
};
const URL_C =
  "https://yoljlsvbmmjebmwelifp.supabase.co/storage/v1/object/public/snigdha/products/c.jpg";

describe("planImageReconcile", () => {
  it("keeps images referenced by id and deletes the rest", () => {
    const plan = planImageReconcile([A, B], [{ id: A.id, url: A.url }, { url: URL_C }]);
    expect(plan.toDelete.map((e) => e.id)).toEqual([B.id]);
    expect(plan.byUrl.get(A.url)?.id).toBe(A.id);
  });

  it("keeps url-only entries that match an existing row by url", () => {
    const plan = planImageReconcile([A, B], [{ url: A.url }]);
    expect(plan.toDelete.map((e) => e.id)).toEqual([B.id]);
    expect(plan.byUrl.get(A.url)?.id).toBe(A.id);
  });

  it("deletes every existing image when nothing is kept", () => {
    const plan = planImageReconcile([A, B], [{ url: URL_C }]);
    expect(plan.toDelete.map((e) => e.id)).toEqual([A.id, B.id]);
  });

  it("keeps all existing images when all are listed", () => {
    const plan = planImageReconcile(
      [A, B],
      [
        { id: A.id, url: A.url },
        { id: B.id, url: B.url },
      ]
    );
    expect(plan.toDelete).toEqual([]);
  });

  it("deduplicates existing rows by url", () => {
    const plan = planImageReconcile([A, B], [{ url: A.url }, { url: B.url }]);
    const urls = [...plan.byUrl.keys()];
    expect(urls).toEqual([A.url, B.url]);
  });
});
