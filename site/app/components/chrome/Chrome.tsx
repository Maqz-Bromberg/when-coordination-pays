"use client";

import { FileText, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { withBase } from "../../lib/base";
import { APPENDIX, CHAPTERS, chapterIndex, href } from "../../lib/chapters";
import { isEnlargedOpen } from "../figure/lightbox-store";
import GlossarySearch from "./GlossarySearch";
import ThemeToggle from "./ThemeToggle";

const pad = (n: number) => String(n).padStart(2, "0");

function RailLinks({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  const clean = path.replace(/^\/+|\/+$/g, "");
  return (
    <>
      <div className="rail-label">Chapters</div>
      <ol className="rail-list">
        {CHAPTERS.map((c) => (
          <li key={c.slug}>
            <Link href={href(c.slug)} onClick={onNavigate} aria-current={clean === c.slug ? "page" : undefined}>
              <span className="rail-num">{pad(c.num)}</span><span>{c.short}</span>
            </Link>
          </li>
        ))}
      </ol>
      <div className="rail-label">Appendix</div>
      <ul className="rail-list rail-appendix">
        {APPENDIX.map((a) => (
          <li key={a.slug}><Link href={href(a.slug)} onClick={onNavigate} aria-current={clean === a.slug ? "page" : undefined}>{a.title}</Link></li>
        ))}
      </ul>
      <a className="rail-paper" href={withBase("/paper.pdf")}><FileText size={14} /> The full paper (PDF)</a>
    </>
  );
}

/** Header, chapter rail (a drawer on narrow screens) and ←/→ chapter navigation. */
export default function Chrome() {
  const path = usePathname() || "/";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const i = chapterIndex(path);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || isEnlargedOpen()) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable], .js-plotly-plot")) return;
      if (i < 0) return;
      if (e.key === "ArrowRight" && i < CHAPTERS.length - 1) router.push(href(CHAPTERS[i + 1].slug));
      if (e.key === "ArrowLeft" && i > 0) router.push(href(CHAPTERS[i - 1].slug));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, router]);

  useEffect(() => setOpen(false), [path]);

  return (
    <>
      <header className="topbar">
        <button type="button" className="icon-btn menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="rail-drawer" aria-label="Chapters">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
        <Link href="/" className="brand">When coordination pays</Link>
        {i > 0 && <span className="crumb"><span className="rail-num">{pad(CHAPTERS[i].num)}</span> {CHAPTERS[i].title}</span>}
        <span className="topbar-gap" />
        <GlossarySearch />
        <ThemeToggle />
      </header>
      <nav className="rail" aria-label="Contents"><RailLinks path={path} /></nav>
      {open && (
        <div className="drawer-backdrop" onClick={() => setOpen(false)}>
          <nav id="rail-drawer" className="drawer" aria-label="Contents" onClick={(e) => e.stopPropagation()}>
            <RailLinks path={path} onNavigate={() => setOpen(false)} />
          </nav>
        </div>
      )}
    </>
  );
}
