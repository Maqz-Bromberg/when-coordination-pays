import fs from "node:fs";
import path from "node:path";

/** A minimal BibTeX reader for ../references.bib: enough for author, title, venue, year, doi. Build time only. */
export type BibEntry = { id: string; type: string; author: string; title: string; venue: string; year: string; doi?: string;
                         short: string };

function delatex(s: string): string {
  const acc: Record<string, Record<string, string>> = {
    '"': { a: "ä", o: "ö", u: "ü", A: "Ä", O: "Ö", U: "Ü" }, "'": { a: "á", e: "é", i: "í", o: "ó", u: "ú", "\\i": "í" },
    "`": { a: "à", e: "è" }, "~": { n: "ñ", a: "ã" }, H: { o: "ő" }, c: { c: "ç" },
  };
  let out = s.replace(/\{\\([\"'`~Hc])\s*\{?(\\i|[A-Za-z])\}?\}/g, (_, a, l) => acc[a]?.[l] ?? l)
    .replace(/\\([\"'`~])\{?(\\i|[A-Za-z])\}?/g, (_, a, l) => acc[a]?.[l] ?? l);
  out = out.replace(/\\&/g, "&").replace(/--/g, "–").replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
  return out;
}

function field(body: string, name: string): string {
  const m = body.match(new RegExp(`\\b${name}\\s*=\\s*\\{((?:[^{}]|\\{(?:[^{}]|\\{[^{}]*\\})*\\})*)\\}`, "i"));
  return m ? delatex(m[1]) : "";
}

let cache: Map<string, BibEntry> | null = null;

export function bibliography(): Map<string, BibEntry> {
  if (cache) return cache;
  const text = fs.readFileSync(path.join(process.cwd(), "..", "references.bib"), "utf8");
  const map = new Map<string, BibEntry>();
  const re = /@(\w+)\s*\{\s*([^,\s]+)\s*,/g;
  let m: RegExpExecArray | null;
  const starts: { type: string; id: string; at: number }[] = [];
  while ((m = re.exec(text))) starts.push({ type: m[1].toLowerCase(), id: m[2], at: m.index });
  starts.forEach((s, i) => {
    const body = text.slice(s.at, i + 1 < starts.length ? starts[i + 1].at : text.length);
    const authors = field(body, "author").split(/\s+and\s+/).filter(Boolean);
    const family = (a: string) => (a.includes(",") ? a.split(",")[0] : a.split(" ").slice(-1)[0]).trim();
    const year = field(body, "year");
    const short = authors.length === 0 ? s.id
      : authors.length === 1 ? `${family(authors[0])} ${year}`
      : authors.length === 2 ? `${family(authors[0])} & ${family(authors[1])} ${year}`
      : `${family(authors[0])} et al. ${year}`;
    const names = authors.map((a) => (a.includes(",") ? `${a.split(",")[1].trim()} ${a.split(",")[0].trim()}` : a));
    const author = names.length > 3 ? `${names.slice(0, 3).join(", ")} et al.` : names.join(", ").replace(/, ([^,]*)$/, " and $1");
    map.set(s.id, {
      id: s.id, type: s.type, author, title: field(body, "title"), year, short,
      venue: field(body, "journal") || field(body, "booktitle") || field(body, "school") || field(body, "publisher") || field(body, "howpublished"),
      doi: field(body, "doi") || undefined,
    });
  });
  cache = map;
  return map;
}

export function cite(id: string): BibEntry {
  const e = bibliography().get(id);
  if (!e) throw new Error(`references.bib: no entry ${id}`);
  return e;
}
