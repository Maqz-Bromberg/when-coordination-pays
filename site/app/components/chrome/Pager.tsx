import Link from "next/link";
import { CHAPTERS, href } from "../../lib/chapters";

const pad = (n: number) => String(n).padStart(2, "0");

/** Previous / next chapter cards at the foot of a chapter. */
export default function Pager({ slug }: { slug: string }) {
  const i = CHAPTERS.findIndex((c) => c.slug === slug);
  const prev = i > 0 ? CHAPTERS[i - 1] : null;
  const next = i < CHAPTERS.length - 1 ? CHAPTERS[i + 1] : null;
  return (
    <nav className="pager" aria-label="Chapter navigation">
      {prev ? (
        <Link href={href(prev.slug)} className="pager-card prev">
          <span className="pager-dir">← {pad(prev.num)}</span><span className="pager-title">{prev.title}</span>
        </Link>
      ) : <span />}
      {next && (
        <Link href={href(next.slug)} className="pager-card next">
          <span className="pager-dir">{pad(next.num)} →</span><span className="pager-title">{next.title}</span>
          <span className="pager-dek">{next.dek}</span>
        </Link>
      )}
    </nav>
  );
}
