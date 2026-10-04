import { describe, expect, it } from "vitest";
import {
  contentPageSchema,
  PAGE_CODE_LIMITS,
  toContentPageData,
} from "@/validators/content-page";

const textPage = {
  type: "TEXT",
  slug: "about",
  title: "About",
  content: "## Hello\n\nWorld.",
};

const landingPage = {
  type: "LANDING",
  slug: "summer-sale",
  title: "Summer sale",
  html: "<section>Sale</section>",
};

describe("contentPageSchema", () => {
  it("accepts a text page", () => {
    const parsed = contentPageSchema.safeParse(textPage);
    expect(parsed.success).toBe(true);
  });

  it("accepts a landing page without css or js", () => {
    const parsed = contentPageSchema.safeParse(landingPage);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.type).toBe("LANDING");
    expect(parsed.data).toMatchObject({ css: "", js: "", useTailwindCdn: false });
  });

  it("rejects a text page with no content", () => {
    const parsed = contentPageSchema.safeParse({ ...textPage, content: "   " });
    expect(parsed.success).toBe(false);
  });

  it("rejects a landing page with no html", () => {
    const parsed = contentPageSchema.safeParse({ ...landingPage, html: "" });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unknown page type", () => {
    const parsed = contentPageSchema.safeParse({ ...textPage, type: "OTHER" });
    expect(parsed.success).toBe(false);
  });

  it("requires html for a landing page even when content is supplied", () => {
    const parsed = contentPageSchema.safeParse({
      ...landingPage,
      html: "",
      content: "some text",
    });
    expect(parsed.success).toBe(false);
  });

  it("does not require content for a landing page", () => {
    const parsed = contentPageSchema.safeParse({ ...landingPage, content: "" });
    expect(parsed.success).toBe(true);
  });

  it("rejects html over the size cap", () => {
    const parsed = contentPageSchema.safeParse({
      ...landingPage,
      html: "a".repeat(PAGE_CODE_LIMITS.html + 1),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects js over the size cap", () => {
    const parsed = contentPageSchema.safeParse({
      ...landingPage,
      js: "a".repeat(PAGE_CODE_LIMITS.js + 1),
    });
    expect(parsed.success).toBe(false);
  });

  it("caps text content", () => {
    const parsed = contentPageSchema.safeParse({
      ...textPage,
      content: "a".repeat(PAGE_CODE_LIMITS.content + 1),
    });
    expect(parsed.success).toBe(false);
  });

  it.each([
    "Bad Slug",
    "trailing-",
    "-leading",
    "double--dash",
    "has space",
    "",
  ])("rejects slug %o", (slug) => {
    expect(contentPageSchema.safeParse({ ...textPage, slug }).success).toBe(false);
  });

  it.each(["about", "about-us", "faq2", "a"])("accepts slug %o", (slug) => {
    expect(contentPageSchema.safeParse({ ...textPage, slug }).success).toBe(true);
  });
});

describe("toContentPageData", () => {
  it("keeps landing fields and clears the text body", () => {
    const parsed = contentPageSchema.parse(landingPage);
    expect(toContentPageData(parsed)).toEqual({
      slug: "summer-sale",
      title: "Summer sale",
      type: "LANDING",
      content: "",
      html: "<section>Sale</section>",
      css: "",
      js: "",
      useTailwindCdn: false,
    });
  });

  it("clears landing fields when converting a page to text", () => {
    const parsed = contentPageSchema.parse(textPage);
    expect(toContentPageData(parsed)).toEqual({
      slug: "about",
      title: "About",
      type: "TEXT",
      content: "## Hello\n\nWorld.",
      html: null,
      css: null,
      js: null,
      useTailwindCdn: false,
    });
  });

  it("preserves the tailwind cdn opt-in", () => {
    const parsed = contentPageSchema.parse({ ...landingPage, useTailwindCdn: true });
    expect(toContentPageData(parsed).useTailwindCdn).toBe(true);
  });
});
