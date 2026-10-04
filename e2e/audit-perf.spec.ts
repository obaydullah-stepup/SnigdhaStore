import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

declare global {
  interface Window {
    __perf?: () => { ttfb: number; dom: number; route: string };
  }
}

type PerfRow = {
  route: string;
  ttfbMs: number;
  domMs: number;
  pass: boolean;
  cold?: boolean;
};

test("L93 audit: warm TTFB + domContentLoaded on /, /shop, product page", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const BUDGET = { ttfbMs: 2000, domMs: 4000 };
  const rows: PerfRow[] = [];

  const measure = async (route: string): Promise<{ ttfb: number; dom: number }> => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const nav = (await page.evaluate(() => {
      const n = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      return {
        ttfb: Math.round(n.responseStart - n.startTime),
        dom: Math.round(n.domContentLoadedEventEnd - n.startTime),
      };
    })) as { ttfb: number; dom: number };
    return nav;
  };

  const warmup = await measure("/");
  rows.push({ route: "/ (cold warm-up)", ttfbMs: warmup.ttfb, domMs: warmup.dom, pass: true, cold: true });
  console.log(`cold warm-up / : TTFB=${warmup.ttfb}ms DOM=${warmup.dom}ms`);

  for (const route of ["/", "/shop", "/product"]) {
    let target = route;
    if (route === "/product") {
      const href = await page.locator('a[href^="/product/"]').first().getAttribute("href");
      expect(href, "expected at least one product link on /shop").toBeTruthy();
      target = href!;
    }
    const { ttfb, dom } = await measure(target);
    rows.push({ route: target, ttfbMs: ttfb, domMs: dom, pass: ttfb < BUDGET.ttfbMs && dom < BUDGET.domMs });
    console.log(`warm ${target} : TTFB=${ttfb}ms DOM=${dom}ms`);
    expect(ttfb, `TTFB ${target} = ${ttfb}ms, budget ${BUDGET.ttfbMs}ms`).toBeLessThan(BUDGET.ttfbMs);
    expect(dom, `DOM  ${target} = ${dom}ms, budget ${BUDGET.domMs}ms`).toBeLessThan(BUDGET.domMs);
  }

  const body = JSON.stringify({ budget: BUDGET, rows }, null, 2);
  await testInfo.attach("perf-results", { body, contentType: "application/json" });
  fs.mkdirSync(path.resolve("scripts-tmp"), { recursive: true });
  fs.writeFileSync(path.resolve("scripts-tmp/perf-results.json"), body);
});