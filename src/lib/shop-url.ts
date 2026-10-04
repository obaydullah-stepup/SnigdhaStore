export type ShopParams = {
  q?: string;
  category?: string;
  min?: string;
  max?: string;
  inStock?: string;
  rating?: string;
  sort?: string;
  page?: string;
};

export function shopUrl(current: ShopParams, overrides: ShopParams = {}): string {
  const merged: ShopParams = { ...current, ...overrides };
  const params = new URLSearchParams();
  (Object.keys(merged) as (keyof ShopParams)[]).forEach((key) => {
    const value = merged[key];
    if (value !== undefined && value !== "") {
      params.set(key, value);
    }
  });
  const qs = params.toString();
  return qs ? `/shop?${qs}` : "/shop";
}

export function stringParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function clearParam(current: ShopParams, keys: (keyof ShopParams)[]): ShopParams {
  const next = { ...current };
  for (const key of keys) delete next[key];
  return next;
}
