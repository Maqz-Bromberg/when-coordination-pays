import fs from "node:fs";
import path from "node:path";
import { withBase } from "../lib/base";
import { bibliography, type BibEntry } from "../lib/bib";

export const metadata = { title: "References" };

/** Every work cited on the site: collected from the <Cite id="…"> calls in the pages at build time. */
function citedIds(): string[] {
  const ids = new Set<string>();
  const walk = (dir: string) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) walk(p);
      else if (/\.tsx$/.test(f.name)) for (const m of fs.readFileSync(p, "utf8").matchAll(/<Cite id="([^"]+)"/g)) ids.add(m[1]);
    }
  };
  walk(path.join(process.cwd(), "app"));
  return Array.from(ids);
}

export default function Page() {
  const bib = bibliography();
  const entries = citedIds().map((id) => bib.get(id)).filter((e): e is BibEntry => !!e)
    .sort((a, b) => a.short.localeCompare(b.short));
  return (
    <main className="chapter">
      <header className="chapter-head" style={{ gridTemplateColumns: "1fr" }}>
        <div><div className="eyebrow">Appendix</div><h1>References</h1>
          <p className="dek">Works cited on this site. DOIs were checked against Crossref. Openly licensed papers and the author&apos;s own are hosted here (PDF); preprints link to arXiv.</p></div>
      </header>
      <ol className="refs">
        {entries.map((e) => (
          <li key={e.id} id={e.id}>
            <span className="ref-short">{e.short}</span>
            <span>{e.author}. {e.title}. <i>{e.venue}</i>, {e.year}.
              {e.pdf && <> <a className="ref-pdf" href={withBase(e.pdf)} target="_blank" rel="noreferrer">PDF</a></>}
              {e.arxiv && <> <a href={`https://arxiv.org/abs/${e.arxiv}`} target="_blank" rel="noreferrer">arXiv:{e.arxiv}</a></>}
              {e.doi && <> <a href={`https://doi.org/${e.doi}`} target="_blank" rel="noreferrer">doi:{e.doi}</a></>}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
