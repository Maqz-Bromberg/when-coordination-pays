import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { APPENDIX } from "../../lib/chapters";
import { render, whole } from "../../lib/docs";

/** Appendix pages from content/appendix/<slug>.md: the headline result and what it implies, then the research detail
 *  folded. Front matter: title, result, implication, chapter, chapterLabel. In the body, `<!-- include: file.md -->`
 *  pulls in a document from docs/, and `<!-- fold: Title -->` starts a new folded section (default: one fold). */
const DIR = path.join(process.cwd(), "content", "appendix");

function load(slug: string) {
  const raw = fs.readFileSync(path.join(DIR, `${slug}.md`), "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${slug}.md: missing front matter`);
  const meta = Object.fromEntries(m[1].split("\n").map((l) => { const i = l.indexOf(":"); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
  const body = m[2].replace(/<!-- include: ([\w.-]+) -->/g, (_, f: string) => whole(f));
  const parts = body.split(/<!-- fold: (.+?) -->/);
  const folds: { title: string; md: string }[] = [];
  if (parts[0].trim()) folds.push({ title: "Research detail: setup, numbers and checks", md: parts[0] });
  for (let i = 1; i < parts.length; i += 2) folds.push({ title: parts[i], md: parts[i + 1] });
  return { meta: meta as Record<string, string>, folds };
}

export function generateStaticParams() {
  return fs.readdirSync(DIR).filter((f) => f.endsWith(".md")).map((f) => ({ slug: f.replace(/\.md$/, "") }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: load(slug).meta.title ?? APPENDIX.find((a) => a.slug === `appendix/${slug}`)?.title ?? "Appendix" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { meta, folds } = load(slug);
  return (
    <main className="chapter">
      <header className="chapter-head" style={{ gridTemplateColumns: "1fr" }}>
        <div>
          <div className="eyebrow">Appendix</div>
          <h1>{meta.title}</h1>
        </div>
      </header>
      <section className="ap-summary">
        <p className="ap-result">{meta.result}</p>
        <p className="ap-implication"><b>What it means.</b> {meta.implication}</p>
        {meta.chapter && <p className="ap-chapter"><Link href={meta.chapter}>{meta.chapterLabel ?? "Read the chapter"} →</Link></p>}
      </section>
      {folds.map((f) => (
        <details key={f.title} className="detail ap-fold">
          <summary>{f.title}</summary>
          <div className="detail-body doc" dangerouslySetInnerHTML={{ __html: render(f.md) }} />
        </details>
      ))}
    </main>
  );
}
