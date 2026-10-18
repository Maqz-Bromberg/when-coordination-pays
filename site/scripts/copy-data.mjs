// Copy files that pages fetch or link at runtime into public/, so they ship as static files:
//  - the per-schedule E5 evolution snapshots for the regime-map slider;
//  - the hosted papers: every references.bib entry with a `file` field, as public/papers/<key>.pdf. Only openly
//    licensed papers and the author's own work carry a `file` field; preprints get an `eprint` (arXiv link) instead.
// Runs before `next build` / `next dev`.
import fs from "node:fs";
import path from "node:path";

const evoSrc = path.resolve("../data/site/e5_evolution");
const evoDst = path.resolve("public/data/e5_evolution");
fs.mkdirSync(evoDst, { recursive: true });
for (const f of fs.readdirSync(evoSrc)) if (f.endsWith(".json")) fs.copyFileSync(path.join(evoSrc, f), path.join(evoDst, f));
console.log(`copied ${fs.readdirSync(evoDst).length} evolution files`);

const bib = fs.readFileSync(path.resolve("../references.bib"), "utf8");
const papersDst = path.resolve("public/papers");
fs.mkdirSync(papersDst, { recursive: true });
let hosted = 0;
for (const m of bib.matchAll(/@\w+\{([^,\s]+),([\s\S]*?)(?=\n@|$)/g)) {
  const file = m[2].match(/\bfile\s*=\s*\{([^}]+)\}/)?.[1];
  if (!file) continue;
  const src = path.resolve("..", file);
  if (!fs.existsSync(src)) { console.warn(`references.bib: ${m[1]}: file not found: ${file}`); continue; }
  fs.copyFileSync(src, path.join(papersDst, `${m[1]}.pdf`));
  hosted++;
}
console.log(`copied ${hosted} hosted papers -> public/papers`);
