import { GLOSSARY, GROUPS } from "../lib/glossary";

export const metadata = { title: "Glossary" };

/** Every term, grouped and coloured by source. Each term has an anchor for the hover cards' "Glossary →" link. */
export default function Page() {
  return (
    <main className="chapter">
      <header className="chapter-head" style={{ gridTemplateColumns: "1fr" }}>
        <div><div className="eyebrow">Appendix</div><h1>Glossary</h1>
          <p className="dek">Terms grouped by where they come from. Underlined terms in the chapters open these definitions in place.</p></div>
      </header>
      {GROUPS.map((g) => (
        <section key={g.id} className="sec gl-group" style={{ "--c": g.color } as React.CSSProperties}>
          <div className="sec-num" style={{ color: g.color }}>{g.source.toUpperCase()}</div>
          <h2>{g.label}</h2>
          <dl className="gl">
            {Object.entries(GLOSSARY).filter(([, e]) => e.group === g.id).map(([k, e]) => (
              <div key={k} id={k} className="gl-item"><dt>{e.term}</dt><dd>{e.def}</dd></div>
            ))}
          </dl>
        </section>
      ))}
    </main>
  );
}
