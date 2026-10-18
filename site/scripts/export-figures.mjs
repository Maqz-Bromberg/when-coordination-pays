// Export every <Figure id="…"> on the site as a standalone vector PDF for the LaTeX paper (live WebGL figures as
// PNG). The figure is isolated on its own chapter page, in the light theme, at the width it has on a desktop page,
// so the paper shows exactly what the site shows.
//
//   npm run build && npx serve out -l 8766 &   (or any static server on the out/ folder)
//   node scripts/export-figures.mjs http://127.0.0.1:8766/ ../paper/figures
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const base = process.argv[2] || "http://127.0.0.1:8766/";
const outDir = path.resolve(process.argv[3] || "../paper/figures");
const CHAPTERS = ["model", "measures", "regimes", "size-and-noise", "robustness", "learning", "memory", "structure", "experiments"];
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1180, height: 1000 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
await ctx.addInitScript(() => { try { localStorage.setItem("theme", "light"); } catch {} });
const page = await ctx.newPage();
const manifest = {};

for (const ch of CHAPTERS) {
  await page.goto(base + ch + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const ids = await page.$$eval("[data-figure-id]", (els) => els.map((e) => e.getAttribute("data-figure-id")));
  for (const id of ids) {
    await page.goto(base + ch + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(id === "paths" ? 2500 : 900);
    const sel = `[data-figure-id="${id}"] .fig-content`;
    const live = await page.$(`${sel} .js-plotly-plot`);
    if (live) {
      const file = `${id}.png`;
      await (await page.$(sel)).screenshot({ path: path.join(outDir, file) });
      manifest[id] = { chapter: ch, file };
      continue;
    }
    const size = await page.evaluate((s) => {
      const node = document.querySelector(s);
      const r = node.getBoundingClientRect();
      const wrap = document.createElement("div");
      wrap.style.cssText = `width:${Math.ceil(r.width)}px;padding:6px;background:var(--surface);`;
      node.style.overflow = "visible";
      wrap.appendChild(node);
      document.body.replaceChildren(wrap);
      document.body.style.cssText = "margin:0;padding:0;background:var(--surface);";
      document.documentElement.style.background = "var(--surface)";
      const b = wrap.getBoundingClientRect();
      return { w: Math.ceil(b.width), h: Math.ceil(b.height) };
    }, sel);
    const file = `${id}.pdf`;
    await page.pdf({ path: path.join(outDir, file), width: `${size.w}px`, height: `${size.h + 2}px`, printBackground: true,
                     margin: { top: 0, right: 0, bottom: 0, left: 0 }, pageRanges: "1" });
    manifest[id] = { chapter: ch, file, ...size };
  }
  console.log(`${ch}: ${ids.join(", ")}`);
}
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 1));
await browser.close();
console.log(`${Object.keys(manifest).length} figures -> ${outDir}`);
