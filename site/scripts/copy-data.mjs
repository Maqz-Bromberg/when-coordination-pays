// Copy run data that pages fetch at runtime (rather than import at build time) into public/, so it ships as static
// files: the per-schedule E5 evolution snapshots for the regime-map slider. Runs before `next build` / `next dev`.
import fs from "node:fs";
import path from "node:path";

const src = path.resolve("../data/site/e5_evolution");
const dst = path.resolve("public/data/e5_evolution");
fs.mkdirSync(dst, { recursive: true });
for (const f of fs.readdirSync(src)) if (f.endsWith(".json")) fs.copyFileSync(path.join(src, f), path.join(dst, f));
console.log(`copied ${fs.readdirSync(dst).length} files -> ${path.relative(process.cwd(), dst)}`);
