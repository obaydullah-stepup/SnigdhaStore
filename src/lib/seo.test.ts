import { describe, expect, it } from "vitest";
import {
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
  buildProductJsonLd,
  formatJsonLd,
} from "@/lib/seo";

describe("buildOrganizationJsonLd", () => {
  const ld = buildOrganizationJsonLd("Test Store");

  it("leaves no unresolved brand placeholder in the description", () => {
    expect(String(ld.description)).not.toContain("{brand}");
    expect(String(ld.description)).toContain("Test Store");
  });

  it("emits schema.org Organization with a context", () => {
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Organization");
  });

  it("wires brand identity fields", () => {
    expect(ld.name).toBe("Test Store");
    expect(ld.url).toMatch(/^https?:\/\//);
    expect(ld.logo).toMatch(/^https?:\/\//);
    expect(ld.sameAs).toEqual(
      expect.arrayContaining([expect.stringMatching(/^https?:\/\//)])
    );
  });

  it("wires a contactPoint serving Bangladesh", () => {
    const contactPoint = ld.contactPoint as Record<string, unknown>;
    expect(contactPoint["@type"]).toBe("ContactPoint");
    expect(contactPoint.contactType).toBe("customer service");
    expect(contactPoint.areaServed).toBe("BD");
  });
});

describe("buildBreadcrumbJsonLd", () => {
  const ld = buildBreadcrumbJsonLd([
    { name: "Home", href: "/" },
    { name: "Shop", href: "/shop" },
    { name: "Page" },
  ]);
  const items = ld.itemListElement as {
    position: number;
    name: string;
    item?: string;
  }[];

  it("assigns sequential 1-based positions", () => {
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
  });

  it("adds absolute item URLs only when a href is provided", () => {
    expect(items[0].item).toMatch(/^https?:\/\//);
    expect(items[1].item).toMatch(/^https?:\/\//);
    expect(items[2].item).toBeUndefined();
  });
});

describe("buildProductJsonLd", () => {
  const ld = buildProductJsonLd({
    name: "Cotton Kurti",
    slug: "cotton-kurti",
    description: "Comfortable cotton <script>alert(1)</script>",
    sku: "SNG-001",
    brand: "Acme",
    price: 1290,
    compareAtPrice: 1500,
    image: "https://cdn.example.com/kurti.jpg",
    categoryName: "Women",
    inStock: true,
    rating: { value: 4.5, count: 12 },
  });

  it("emits schema.org Product with an Offer", () => {
    expect(ld["@type"]).toBe("Product");
    expect(ld.sku).toBe("SNG-001");
    const offers = ld.offers as {
      "@type": string;
      priceCurrency: string;
      price: number;
      availability: string;
      url: string;
    };
    expect(offers["@type"]).toBe("Offer");
    expect(offers.priceCurrency).toBe("BDT");
    expect(offers.price).toBe(1290);
    expect(offers.availability).toBe("https://schema.org/InStock");
    expect(offers.url).toMatch(/^https?:\/\/.*\/product\/cotton-kurti$/);
  });

  it("includes aggregateRating when reviews exist", () => {
    const rating = ld.aggregateRating as Record<string, unknown>;
    expect(rating["@type"]).toBe("AggregateRating");
    expect(rating.ratingValue).toBe(4.5);
    expect(rating.reviewCount).toBe(12);
  });

  it("marks out-of-stock availability", () => {
    const out = buildProductJsonLd({
      name: "Sold Out Item",
      slug: "sold-out-item",
      description: null,
      sku: "SNG-002",
      brand: null,
      price: 500,
      compareAtPrice: null,
      image: undefined,
      categoryName: null,
      inStock: false,
      rating: { value: 0, count: 0 },
    });
    const offers = out.offers as { availability: string };
    expect(offers.availability).toBe("https://schema.org/OutOfStock");
  });
});

describe("formatJsonLd", () => {
  it("escapes angle brackets to prevent script-injection", () => {
    const out = formatJsonLd({ description: "a <b>bold</b>" });
    expect(out).toContain("a \\u003cb>bold\\u003c/b>");
    expect(out).not.toContain("</");
  });
});
