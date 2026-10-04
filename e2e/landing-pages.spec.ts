import { expect, test, type Page } from "@playwright/test";

const SLUG = "summer-sale";

/**
 * Reuse the admin session and the "necessary only" consent choice cached by
 * globalSetup. Scoped to this file: the storefront specs must start signed out
 * and with the banner unanswered, otherwise their own flows change.
 */
test.use({ storageState: "e2e/.auth/admin.json" });

/**
 * These specs run with the admin session cached by `globalSetup` (see
 * `storageState` in playwright.config.ts). Signing in per test would hit the
 * login action's rate limit, so this only verifies the session is still live and
 * signs in on demand if the cookie jar went stale.
 */
async function login(page: Page) {
  await page.goto("/admin/pages");
  if (!page.url().includes("/login")) return;

  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").replace(/^"|"$/g, "");
  const password = (process.env.ADMIN_PASSWORD ?? "").replace(/^"|"$/g, "");
  await page.getByLabel(/^email/i).fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 });
}

/** Creates a page through the admin form, the same way a human would. */
async function createPage(
  page: Page,
  opts: {
    slug: string;
    title: string;
    landing?: boolean;
    content?: string;
    html?: string;
    css?: string;
    js?: string;
  }
) {
  await login(page);
  await page.goto("/admin/pages/new", { waitUntil: "networkidle" });

  if (opts.landing) await page.locator('input[name="pageTypeChoice"][value="LANDING"]').check();

  await page.locator("#title").fill(opts.title);
  await page.locator("#slug").fill(opts.slug);

  if (opts.landing) {
    await page.locator("#html").fill(opts.html ?? "<p>body</p>");
    if (opts.css !== undefined) {
      await page.getByRole("tab", { name: "CSS" }).click();
      await page.locator("#css").fill(opts.css);
    }
    if (opts.js !== undefined) {
      await page.getByRole("tab", { name: "JavaScript" }).click();
      await page.locator("#js").fill(opts.js);
    }
  } else {
    await page.locator("#content").fill(opts.content ?? "## Heading\n\nBody text.");
  }

  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/admin/pages", { timeout: 20_000 });
}

/** Removes a page by its title from the admin list. */
async function deletePage(page: Page, title: string) {
  await login(page);
  await page.goto("/admin/pages", { waitUntil: "networkidle" });
  const row = page.locator("li", { hasText: title }).first();
  await row.locator('button[aria-label="Delete page"]').click();
  await expect(row).toHaveCount(0, { timeout: 15_000 });
}

test("landing page renders author HTML, CSS and JS on a bare route", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  const response = await page.goto(`/pages/${SLUG}`, { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);

  await expect(page.locator(".hero h1")).toHaveText("Summer Sale");

  // Author CSS is applied, not merely present in the document. This regressed
  // when the CSS was wrapped in `@layer components, utilities { ... }`, which
  // Chromium drops as invalid, so the computed value is the real assertion.
  const bg = await page
    .locator(".hero")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe("rgb(249, 115, 22)");

  // Full-bleed choice: the site chrome must not wrap a landing page.
  await expect(page.locator("header")).toHaveCount(0);
  await expect(page.locator("footer")).toHaveCount(0);

  // Author JS executed on load and its handler is live.
  await expect(page.locator("html")).toHaveAttribute("data-js-ran", "true");
  await page.locator("#cta").click();
  await expect(page.locator("#out")).toContainText("JS ran at");

  // Opt-in Tailwind CDN is present.
  await expect(page.locator('script[src*="cdn.tailwindcss.com"]')).toHaveCount(1);

  expect(errors).toEqual([]);
});

test("text pages still render through the mini-markdown path", async ({ page }) => {
  const slug = "spec-text-page";
  const title = "Spec Text Page";
  await createPage(page, {
    slug,
    title,
    content: "## Spec heading\n\nA paragraph from the spec.\n\n- first\n- second",
  });

  await page.goto(`/pages/${slug}`, { waitUntil: "networkidle" });
  await expect(page.locator("h1")).toContainText(title);
  // Real <p>/<ul> elements from React text nodes, so no markup leaks through.
  await expect(page.locator("p", { hasText: "A paragraph from the spec." })).toBeVisible();
  await expect(page.locator("ul li")).toHaveCount(2);

  await deletePage(page, title);
});

test("inactive CSS and JS panes still submit with the form", async ({ page }) => {
  const slug = "spec-panes-submit";
  const title = "Spec Panes Submit";
  await createPage(page, {
    slug,
    title,
    landing: true,
    html: '<div class="spec-target">hello</div>',
    css: ".spec-target { color: #16a34a; }",
    js: "window.__specJsRan = true;",
  });

  await page.goto(`/pages/${slug}`, { waitUntil: "networkidle" });
  // CSS authored in a tab that was not the active one on submit still applied.
  await expect(page.locator(".spec-target")).toHaveCSS("color", "rgb(22, 163, 74)");
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__specJsRan)).toBe(
    true
  );

  await deletePage(page, title);
});

test("switching a page from landing back to text clears the stored markup", async ({ page }) => {
  const slug = "spec-type-switch";
  const title = "Spec Type Switch";
  await createPage(page, {
    slug,
    title,
    landing: true,
    html: "<p>markup that must not survive</p>",
    css: ".x { color: red; }",
    js: "window.__leaked = true;",
  });

  // Edit it and convert to a text page.
  await page.goto("/admin/pages", { waitUntil: "networkidle" });
  await page
    .locator("li", { hasText: title })
    .first()
    .locator('a[aria-label="Edit page"]')
    .click();
  await page.waitForURL(/\/admin\/pages\/[^/]+$/);
  await page.locator('input[name="pageTypeChoice"][value="TEXT"]').check();
  await page.locator("#content").fill("## Now just text");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/admin/pages", { timeout: 20_000 });

  await page.goto(`/pages/${slug}`, { waitUntil: "networkidle" });
  await expect(page.locator("h1")).toContainText(title);
  await expect(page.locator("body")).toContainText("Now just text");
  // Neither the old markup nor its CSS/JS survived the type change.
  await expect(page.locator("body")).not.toContainText("markup that must not survive");
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__leaked)).toBe(
    undefined
  );

  await deletePage(page, title);
});

test("admin list labels each page type", async ({ page }) => {
  await login(page);
  await page.goto("/admin/pages", { waitUntil: "networkidle" });

  await expect(page.locator("li", { hasText: "Summer Sale" }).first()).toContainText("Landing");
});

test("editor loads stored landing fields into the tabbed panes", async ({ page }) => {
  await login(page);
  await page.goto("/admin/pages", { waitUntil: "networkidle" });
  await page
    .locator("li", { hasText: "Summer Sale" })
    .first()
    .locator('a[aria-label="Edit page"]')
    .click();
  await page.waitForURL(/\/admin\/pages\/[^/]+$/);

  await expect(page.locator("#html")).toHaveValue(/Summer Sale/);

  await page.getByRole("tab", { name: "CSS" }).click();
  await expect(page.locator("#css")).toHaveValue(/\.hero/);

  await page.getByRole("tab", { name: "JavaScript" }).click();
  await expect(page.locator("#js")).toHaveValue(/data-js-ran/);
});

test("new page form offers both types and swaps the editor", async ({ page }) => {
  await login(page);
  await page.goto("/admin/pages/new", { waitUntil: "networkidle" });

  await expect(page.locator('input[name="pageTypeChoice"][value="TEXT"]')).toBeChecked();
  await expect(page.locator("#content")).toBeVisible();

  await page.locator('input[name="pageTypeChoice"][value="LANDING"]').check();

  await expect(page.getByRole("tab", { name: "HTML" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "CSS" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "JavaScript" })).toBeVisible();
  await expect(page.locator('input[name="useTailwindCdn"]')).toBeVisible();
  // The text body is replaced, not shown alongside the code panes.
  await expect(page.locator("#content")).toHaveCount(0);
});

test("a landing page cannot be submitted without HTML", async ({ page }) => {
  await login(page);
  await page.goto("/admin/pages/new", { waitUntil: "networkidle" });

  await page.locator('input[name="pageTypeChoice"][value="LANDING"]').check();
  await page.locator("#title").fill("Spec Empty Landing");
  await page.locator("#slug").fill("spec-empty-landing");
  await page.locator("#html").fill("");

  // Submit stays disabled until the required body is present.
  await expect(page.locator('button[type="submit"]')).toBeDisabled();

  await page.locator("#html").fill("<p>now valid</p>");
  await expect(page.locator('button[type="submit"]')).toBeEnabled();
});

test("a duplicate slug is rejected by the server action", async ({ page }) => {
  await login(page);
  await page.goto("/admin/pages/new", { waitUntil: "networkidle" });

  await page.locator("#title").fill("Spec Duplicate");
  await page.locator("#slug").fill(SLUG);
  await page.locator("#content").fill("## Collision");
  await page.locator('button[type="submit"]').click();

  await expect(page.locator("body")).toContainText("already exists");
});
