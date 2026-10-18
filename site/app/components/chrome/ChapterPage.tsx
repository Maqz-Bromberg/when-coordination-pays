import { CHAPTERS } from "../../lib/chapters";
import Pager from "./Pager";

const pad = (n: number) => String(n).padStart(2, "0");

/** Chapter frame: numbered header, the sections, and the pager. */
export default function ChapterPage({ slug, children }: { slug: string; children: React.ReactNode }) {
  const c = CHAPTERS.find((x) => x.slug === slug)!;
  return (
    // Figures are numbered "Figure <chapter>.<n>" by CSS counters (site.css), in page order.
    <main className="chapter" data-chapter={c.num} style={{ counterReset: `fig 0 chap ${c.num}` }}>
      <header className="chapter-head">
        <div className="chapter-num" aria-hidden>{pad(c.num)}</div>
        <div>
          <div className="eyebrow">Chapter {c.num}</div>
          <h1>{c.title}</h1>
          <p className="dek">{c.dek}</p>
        </div>
      </header>
      {children}
      <Pager slug={slug} />
    </main>
  );
}

/** One heading's section: separated as its own band, numbered within the chapter. */
export function Section({ n, title, id, children }: { n: string; title: string; id: string; children: React.ReactNode }) {
  return (
    <section className="sec" id={id} aria-labelledby={`${id}-h`}>
      <div className="sec-num">{n}</div>
      <h2 id={`${id}-h`}><a href={`#${id}`} className="anchor">{title}</a></h2>
      <div className="sec-body">{children}</div>
    </section>
  );
}

/** Expandable granular detail inside a section. */
export function Details({ title, children, open = false, wide = false }: { title: React.ReactNode; children: React.ReactNode; open?: boolean; wide?: boolean }) {
  return (
    <details className={wide ? "detail detail-wide" : "detail"} open={open}>
      <summary>{title}</summary>
      <div className="detail-body">{children}</div>
    </details>
  );
}

/** A short, highlighted take-away. */
export function Takeaway({ children }: { children: React.ReactNode }) {
  return <p className="takeaway">{children}</p>;
}
