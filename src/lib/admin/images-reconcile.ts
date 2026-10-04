export type ExistingImage = { id: string; url: string };
export type ImageInput = { id?: string; url: string };

export type ImageReconcilePlan = {
  toDelete: ExistingImage[];
  byUrl: Map<string, ExistingImage>;
};

/**
 * Compares the image rows currently in the DB against the ordered list coming
 * from the product form. An existing row is only deleted when it is neither
 * referenced by id nor by url in the incoming list. New uploads arrive as
 * url-only entries, so matching by url keeps already-saved images intact even
 * if the browser never round-tripped their DB ids.
 */
export function planImageReconcile(
  existing: ExistingImage[],
  incoming: ImageInput[]
): ImageReconcilePlan {
  const keepIds = new Set(
    incoming.map((i) => i.id).filter((id): id is string => Boolean(id))
  );
  const incomingUrls = new Set(incoming.map((i) => i.url));
  const toDelete = existing.filter((e) => !keepIds.has(e.id) && !incomingUrls.has(e.url));
  const byUrl = new Map(
    existing.filter((e) => incomingUrls.has(e.url)).map((e) => [e.url, e])
  );
  return { toDelete, byUrl };
}
