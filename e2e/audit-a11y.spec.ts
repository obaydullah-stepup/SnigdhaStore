import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as axe from "axe-core";

type Violation = {
  id: string;
  impact: string;
  nodes: number;
  firstTarget: string;
  help: string;
};

test("L94 audit: axe-core WCAG A/AA + best-practice scan on / and /shop", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const summaryByRoute = new Map<string, Violation[]>();

  for (const target of ["/", "/shop"]) {
    await page.goto(target, { waitUntil: "networkidle" });
    await page.addScriptTag({ content: axe.source });

    const violations = (await page.evaluate(async () => {
      const win = window as unknown as {
        axe: { run: (doc: Document, opts: unknown) => Promise<axe.AxeResults> };
      };
      const result = await win.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
      });
      return result.violations as Array<{
        id: string;
        impact: string;
        help: string;
        nodes: Array<{ target: string[] }>;
      }>;
    })) as Array<{ id: string; impact: string; help: string; nodes: Array<{ target: string[] }> }>;

    const summary: Violation[] = violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
      firstTarget: (v.nodes[0]?.target ?? []).join(" ") || "(no target)",
      help: v.help,
    }));

    summaryByRoute.set(target, summary);
    console.log(`axe ${target}: ${summary.length} violation(s)`);
    for (const v of summary) {
      console.log(`  ${v.id} [${v.impact}] nodes=${v.nodes} first=${v.firstTarget}`);
    }
  }

  const all = [...summaryByRoute.entries()].map(([page, violations]) => ({ page, violations }));
  const body = JSON.stringify(all, null, 2);
  await testInfo.attach("a11y-results", { body, contentType: "application/json" });
  fs.mkdirSync(path.resolve("scripts-tmp"), { recursive: true });
  fs.writeFileSync(path.resolve("scripts-tmp/a11y-results.json"), body);

  const flat = all.flatMap(({ page, violations }) =>
    violations.map((v) => ({ ...v, page }))
  );
  expect(flat, `axe violations:\n${body}`).toEqual([]);
});