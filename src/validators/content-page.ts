import { z } from "zod";

/** Upper bounds on author-supplied markup, mirroring product description caps. */
export const PAGE_CODE_LIMITS = {
  content: 20_000,
  html: 1_000_000,
  css: 200_000,
  js: 100_000,
} as const;

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letters, numbers and dashes only.");

const baseShape = {
  slug: slugSchema,
  title: z.string().trim().min(1).max(120),
};

/**
 * A page is either TEXT (the `##` / `-` mini-markdown body) or LANDING
 * (author-supplied HTML, plus optional CSS and JS). The two shapes validate
 * independently so a landing page never has to satisfy the text rules, and a
 * text page cannot smuggle markup through `content`.
 */
export const contentPageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("TEXT"),
    ...baseShape,
    content: z
      .string()
      .trim()
      .min(1, "Content is required for a text page.")
      .max(PAGE_CODE_LIMITS.content, "Content is too long."),
  }),
  z.object({
    type: z.literal("LANDING"),
    ...baseShape,
    html: z
      .string()
      .trim()
      .min(1, "HTML is required for a landing page.")
      .max(PAGE_CODE_LIMITS.html, "HTML is too long."),
    css: z.string().max(PAGE_CODE_LIMITS.css, "CSS is too long.").optional().default(""),
    js: z
      .string()
      .max(PAGE_CODE_LIMITS.js, "JavaScript is too long.")
      .optional()
      .default(""),
    useTailwindCdn: z.boolean().optional().default(false),
  }),
]);

export type ContentPageInput = z.infer<typeof contentPageSchema>;

export type ContentPageFormState = { ok: boolean; error?: string };

/**
 * Normalises a validated page into Prisma write data, clearing the fields that
 * do not belong to its type so switching types cannot leave stale markup behind.
 */
export function toContentPageData(input: ContentPageInput) {
  if (input.type === "LANDING") {
    return {
      slug: input.slug,
      title: input.title,
      type: "LANDING" as const,
      content: "",
      html: input.html,
      css: input.css ?? "",
      js: input.js ?? "",
      useTailwindCdn: input.useTailwindCdn ?? false,
    };
  }
  return {
    slug: input.slug,
    title: input.title,
    type: "TEXT" as const,
    content: input.content,
    html: null,
    css: null,
    js: null,
    useTailwindCdn: false,
  };
}
