"use client";
/** Searchable glossary in the top bar. Typing filters terms and definitions; results are grouped and coloured by
 *  source, and each term expands to its definition. "/" focuses the search, Esc closes it. On narrow screens the
 *  field moves into the panel behind a search button. */
import { BookOpen, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { GLOSSARY, GROUPS } from "../../lib/glossary";

const GREEK: Record<string, string> = {
  α: "alpha", β: "beta", γ: "gamma", δ: "delta", ε: "epsilon", ζ: "zeta", η: "eta", θ: "theta", κ: "kappa", λ: "lambda",
  μ: "mu", ν: "nu", ξ: "xi", π: "pi", ρ: "rho", σ: "sigma", τ: "tau", φ: "phi", χ: "chi", ψ: "psi", ω: "omega", Σ: "sigma",
};
const spell = (s: string) => s.replace(/[α-ωΣ]/g, (c) => ` ${GREEK[c] ?? c} `);
/** Lower case, accents dropped, hyphens and dashes as spaces, whitespace collapsed; haystack() adds the Greek letters
 *  spelled out, so "kappa" finds κ, "κ" finds "kappa" and "self rein" finds "self-reinforcement". */
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[-‐–—_]/g, " ").replace(/\s+/g, " ");
const haystack = (s: string) => `${norm(s)} ${norm(spell(s))}`;

export default function GlossarySearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const panelField = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const nq = norm(spell(q)).trim();
    const all = Object.entries(GLOSSARY);
    const inTerm = (e: (typeof all)[number][1]) => haystack(e.term).includes(nq);
    const hits = nq ? all.filter(([, e]) => inTerm(e) || haystack(e.def).includes(nq)) : all;
    // terms whose name matches come before those matched only in the definition
    const rank = ([, e]: (typeof all)[number]) => (nq && !inTerm(e) ? 1 : 0);
    return GROUPS.map((g) => ({ g, items: hits.filter(([, e]) => e.group === g.id).sort((a, b) => rank(a) - rank(b)) }))
      .filter((x) => x.items.length);
  }, [q]);
  const count = results.reduce((n, r) => n + r.items.length, 0);

  useEffect(() => {
    if (count === 1) setExpanded(results[0].items[0][0]);
  }, [count, results]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !t.closest("input, textarea, select, [contenteditable]")) {
        e.preventDefault();
        setOpen(true);
        (window.innerWidth < 760 ? panelField : field).current?.focus();
      }
      if (e.key === "Escape" && open) { setOpen(false); (t as HTMLElement).blur?.(); }
    };
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [open]);

  useEffect(() => { if (open && window.innerWidth < 760) panelField.current?.focus(); }, [open]);

  const input = (ref: React.RefObject<HTMLInputElement | null>, id: string) => (
    <label className="gls-field" htmlFor={id}>
      <Search size={14} aria-hidden />
      <input ref={ref} id={id} type="search" placeholder="Search terms: kappa, nats…" value={q} autoComplete="off"
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter" && results[0]) setExpanded(results[0].items[0][0]); }}
        aria-controls="gls-panel" aria-expanded={open} />
      <kbd>/</kbd>
    </label>
  );

  return (
    <div className="gls" ref={root}>
      <div className="gls-inline">{input(field, "gls-q")}</div>
      <button type="button" className="icon-btn gls-btn" aria-label="Search the glossary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? <X size={16} /> : <BookOpen size={16} />}
      </button>
      {open && (
        <div id="gls-panel" className="gls-panel" role="region" aria-label="Glossary">
          <div className="gls-panel-field">{input(panelField, "gls-q2")}</div>
          <div className="gls-meta">{q ? `${count} term${count === 1 ? "" : "s"} match “${q}”` : `${count} terms · click one for its definition`}</div>
          {results.map(({ g, items }) => (
            <section key={g.id} className="gls-group" style={{ "--c": g.color } as React.CSSProperties}>
              <div className="gls-group-head"><b>{g.label}</b> <span>{g.source}</span></div>
              <ul>
                {items.map(([k, e]) => (
                  <li key={k}>
                    <button type="button" className="gls-term" aria-expanded={expanded === k} onClick={() => setExpanded(expanded === k ? null : k)}>{e.term}</button>
                    {expanded === k && (
                      <p>{e.def}{e.see && <> <Link href={e.see.href} onClick={() => setOpen(false)}>→ {e.see.label}</Link></>}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {count === 0 && <p className="gls-empty">Nothing matches. Try a symbol or its name (κ or kappa), or a word from a definition.</p>}
          <div className="gls-foot"><Link href="/glossary/" onClick={() => setOpen(false)}>Full glossary page →</Link><span>← → move between chapters</span></div>
        </div>
      )}
    </div>
  );
}
