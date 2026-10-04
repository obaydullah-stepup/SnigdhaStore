import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getLayoutSettings } from "@/lib/settings";

/**
 * Regression guard for a real incident: the `footer.description` row held the
 * literal text "Snigdha is a premium Bangladeshi online store …" while
 * `store.name` was "Aroshi BD". `resolveBrand()` only substitutes `{brand}`, so
 * the stale literal rendered verbatim — on the site footer *and* on every
 * printed invoice, which reads the same settings.
 */
describe("footer.description branding", () => {
  it("stores the description on the {brand} placeholder, not a literal name", async () => {
    const row = await prisma.setting.findUnique({
      where: { key: "footer.description" },
      select: { value: true },
    });

    expect(row, "footer.description row is missing").not.toBeNull();
    expect(
      row?.value,
      "footer.description has drifted to a hardcoded store name. Rewrite it as " +
        "siteConfig.description (which uses {brand}) so it tracks store.name."
    ).toContain("{brand}");
  });

  it("resolves the description to the live store name", async () => {
    const settings = await getLayoutSettings();
    const row = await prisma.setting.findUnique({
      where: { key: "footer.description" },
      select: { value: true },
    });

    expect(settings.storeName.length).toBeGreaterThan(0);
    expect(settings.footerDescription).toBe(
      (row?.value ?? "").replace("{brand}", settings.storeName)
    );
    // The rendered description must name the current store.
    expect(settings.footerDescription).toContain(settings.storeName);
  });

  it("leaves no unresolved {brand} placeholder in any rendered field", async () => {
    const settings = await getLayoutSettings();

    // A partially-applied rename would surface a literal "{brand}" to
    // customers on the footer or on a printed invoice.
    const rendered = JSON.stringify({
      ...settings,
      socials: undefined,
    });

    expect(rendered).not.toContain("{brand}");
  });
});
