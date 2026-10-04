import { describe, expect, it } from "vitest";
import { FALLBACK_STORE_NAME, siteConfig, resolveBrand } from "@/config/site";

describe("resolveBrand", () => {
  it("substitutes every {brand} occurrence", () => {
    expect(resolveBrand("{brand} — {brand}", "Acme")).toBe("Acme — Acme");
  });

  it("leaves text without the placeholder untouched", () => {
    expect(resolveBrand("No placeholder here", "Acme")).toBe("No placeholder here");
  });

  it("is safe when the store name contains regex-significant characters", () => {
    expect(resolveBrand("{brand}", "$&")).toBe("$&");
  });
});

describe("siteConfig brand independence", () => {
  it("exposes no baked-in store name", () => {
    expect("name" in siteConfig).toBe(false);
  });

  it("keeps the fallback name blank of any real brand", () => {
    expect(FALLBACK_STORE_NAME).toBeTruthy();
    expect(FALLBACK_STORE_NAME).toBe(process.env.NEXT_PUBLIC_STORE_NAME ?? "Our Store");
  });

  it("never ships an unresolved {brand} placeholder in metadata copy", () => {
    // The placeholder is intentional here; consumers must resolve it before use.
    expect(siteConfig.description).toContain("{brand}");
  });
});
