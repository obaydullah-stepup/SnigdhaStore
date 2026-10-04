import "dotenv/config";
import { prisma } from "@/lib/prisma";

const SLUG = "summer-sale";

const HTML = `<section class="hero">
  <h1>Summer Sale</h1>
  <p>Up to 50% off everything.</p>
  <button id="cta" type="button">Shop the sale</button>
  <p id="out"></p>
</section>`;

const CSS = `.hero {
  background: #f97316;
  color: #ffffff;
  padding: 64px 32px;
  text-align: center;
  font-family: system-ui, sans-serif;
}
.hero h1 { font-size: 40px; margin: 0 0 8px; }
#cta { margin-top: 16px; padding: 10px 20px; border-radius: 8px; border: 0;
  background: #111111; color: #ffffff; cursor: pointer; }`;

const JS = `document.getElementById('cta').addEventListener('click', () => {
  document.getElementById('out').textContent = 'JS ran at ' + new Date().toISOString();
});
document.documentElement.setAttribute('data-js-ran', 'true');`;

async function main() {
  const data = {
    slug: SLUG,
    title: "Summer Sale",
    type: "LANDING" as const,
    content: "",
    html: HTML,
    css: CSS,
    js: JS,
    useTailwindCdn: true,
  };
  const existing = await prisma.contentPage.findUnique({
    where: { slug: SLUG },
    select: { id: true },
  });
  const page = existing
    ? await prisma.contentPage.update({ where: { id: existing.id }, data })
    : await prisma.contentPage.create({ data });

  // Leftovers from an interrupted run would make the type-label assertion lie.
  const stale = await prisma.contentPage.deleteMany({ where: { slug: "panes-submit" } });

  console.log(`fixture ${existing ? "updated" : "created"}: ${page.slug} (${page.id})`);
  console.log(`removed ${stale.count} stale fixture(s)`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERR", String(e.message).slice(0, 300));
  process.exitCode = 1;
});
