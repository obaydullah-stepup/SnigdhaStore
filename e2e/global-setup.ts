import { chromium, type FullConfig } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const AUTH_STATE_FILE = path.join("e2e", ".auth", "admin.json");

/**
 * Seeds the `summer-sale` landing page that `landing-pages.spec.ts` asserts
 * against, so the suite does not depend on someone having created it by hand in
 * the admin UI first. Idempotent: it upserts by slug and clears a stale fixture.
 *
 * The fixture runs as a child process with the `tsx` loader because Playwright
 * loads this file without the ESM loader that the app's generated Prisma client
 * needs, and importing `@/lib/prisma` here fails on `import.meta`.
 *
 * It also signs in as the admin once and caches the cookie jar. The login action
 * is rate limited to 10 attempts per 15 minutes per IP, and the in-memory limiter
 * lives in the production server process, so logging in from every spec would
 * lock the suite out of its own admin pages.
 */
export default async function globalSetup(config: FullConfig) {
  execFileSync(
    process.execPath,
    ["--import", "tsx", path.join("e2e", "fixtures", "seed-landing-page.ts")],
    { stdio: "inherit", env: process.env, cwd: process.cwd() }
  );

  await fs.mkdir(path.dirname(AUTH_STATE_FILE), { recursive: true });
  await fs.writeFile(AUTH_STATE_FILE, await adminStorageState(config), "utf8");
}

export { AUTH_STATE_FILE };

async function adminStorageState(config: FullConfig): Promise<string> {
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3101";
  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").replace(/^"|"$/g, "");
  const password = (process.env.ADMIN_PASSWORD ?? "").replace(/^"|"$/g, "");

  if (password.length < 8) {
    throw new Error(
      "ADMIN_PASSWORD is not set (or too short). playwright.config.ts loads it from .env."
    );
  }

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await page.goto("/login", { waitUntil: "networkidle" });
    await page.getByLabel(/^email/i).fill(email);
    await page.getByLabel(/^password/i).fill(password);
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    // The login form reports failures inline; a rate-limited or rejected attempt
    // leaves us on /login, so fail here with the message the admin would see.
    try {
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 });
    } catch {
      const message = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 300);
      throw new Error(`E2E admin login failed. Page said: ${message}`);
    }

    // Session cookies are httpOnly, so they need the browser context state.
    const state = await context.storageState();
    const origin = new URL(baseURL).origin;

    // Pre-record an analytics choice. The consent banner is fixed to the bottom
    // of the viewport and sits over primary actions, so leaving it unanswered
    // makes clicks in the admin UI time out on `subtree intercepts pointer
    // events`. Choosing "necessary only" keeps analytics out of the test runs.
    state.origins = [
      {
        origin,
        localStorage: [
          { name: "snigdha_consent", value: JSON.stringify({ analytics: false, marketing: false }) },
        ],
      },
    ];

    return JSON.stringify(state, null, 2);
  } finally {
    await browser.close();
  }
}
