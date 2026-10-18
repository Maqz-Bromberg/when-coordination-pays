import Link from "next/link";
import Pager from "./components/chrome/Pager";
import HeroNetwork from "./components/HeroNetwork";
import Cite from "./components/ui/Cite";
import T from "./components/ui/T";
import { withBase } from "./lib/base";
import { CHAPTERS, href } from "./lib/chapters";

const FINDINGS: { c: string; title: string; body: string; to: string }[] = [
  { c: "var(--hi)", title: "Coordination works in a window of commitment.", to: "regimes",
    body: "Too much commitment relative to self-reinforcement freezes the group on whoever led early. Too little leaves attention spread. In between, one hub forms on the current source and follows it. The window's edges follow from exact formulas." },
  { c: "var(--ss)", title: "A hub costs twice as much as no structure, at any size; its benefit grows with size.", to: "size-and-noise",
    body: "Value per unit of structure nearly doubles from 10 to 80 agents. But the window narrows as groups grow, so large groups must tune their commitment more finely." },
  { c: "var(--ob)", title: "Noise is paid in precision, not in structure.", to: "size-and-noise",
    body: "False alarms do not make the hub dearer. They shrink the usable window: by a fifth at 25% false alarms, half at 50%, four fifths at 75%." },
  { c: "var(--an)", title: "The hub survives noise through uneven rivals and relays.", to: "robustness",
    body: "False alarms leave short-lived side hubs; uneven rivals compete less, and the true hub relays even false news. The trace is loops among the rivals while the hub holds." },
  { c: "var(--nl)", title: "Learning through others beats learning alone, up to a point.", to: "learning",
    body: "Rewarding a link for its position near the news beats rewarding direct evidence by 5–10 points under heavy noise, and comes within 1–3% of an ideal statistician up to 50% false alarms." },
  { c: "var(--muted)", title: "Shape alone misleads.", to: "structure",
    body: "A hub on a stale source looks exactly as hierarchical as a hub on the right one, and costs as much. Only functional measures tell them apart." },
];

const pad = (n: number) => String(n).padStart(2, "0");

export default function Home() {
  return (
    <main>
      <div className="hero">
        <HeroNetwork />
        <div className="hero-text">
          <div className="eyebrow">Attention networks · moving sources · noisy signals</div>
          <h1>When coordination pays</h1>
          <p className="lead">
            A group of agents learns whom to listen to while the source of useful news moves and the signal is noisy.
            When does it organize around the right hub, what does that buy, what does it cost, and what breaks it?
          </p>
          <div className="hero-legend" aria-hidden>
            <span><i style={{ background: "var(--ss)" }} />current source</span>
            <span><i style={{ background: "var(--ink)" }} />stale hub</span>
            <span><i style={{ border: "2px dashed var(--ob)" }} />false alarm</span>
            <span>live, simplified run of the model</span>
          </div>
        </div>
      </div>

      <div className="chapter">
        <section className="sec" id="findings" style={{ borderTop: 0 }}>
          <div className="sec-num">KEY FINDINGS</div>
          <h2>Six results in one screen</h2>
          <div className="findings">
            {FINDINGS.map((f) => (
              <Link key={f.title} href={href(f.to)} className="finding" style={{ "--c": f.c } as React.CSSProperties}>
                <b>{f.title}</b>
                <span>{f.body}</span>
                <span className="go">Read the chapter →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="sec" id="about">
          <div className="sec-num">WHAT THIS IS</div>
          <h2>A model of coordination, tested by simulation and solved where possible</h2>
          <div className="sec-body">
            <p>
              The model joins three lines of work. A thesis on how the place where information appears shapes who
              listens to whom <Cite id="bromberg2020hierarchy" />. Work on how much memory a learner should keep in a
              changing, noisy world <Cite id="lee2024constructing" />. And adaptive transport networks, which grow the
              links that carry flow <Cite id="corson2010fluctuations" />. You do not need to have read any of them: the
              chapters explain the model in its own terms, and the last chapter says how each original premise fared.
            </p>
            <p>
              Terms with a dotted underline, like <T k="kappa">self-reinforcement κ</T> or{" "}
              <T k="T">commitment T</T>, open a definition on hover or tap. Every figure can be enlarged. Use ← and → to
              move between chapters. The whole study is also written up as one paper.
            </p>
            <p><a href={withBase("/paper.pdf")}>Read the paper (PDF) →</a></p>
          </div>
        </section>

        <section className="sec" id="contents">
          <div className="sec-num">CONTENTS</div>
          <h2>Chapters</h2>
          <ol className="toc">
            {CHAPTERS.slice(1).map((c) => (
              <li key={c.slug}>
                <Link href={href(c.slug)}>
                  <span className="toc-num">{pad(c.num)}</span><span className="toc-title">{c.title}</span>
                  <span className="toc-dek">{c.dek}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
        <Pager slug="" />
      </div>
    </main>
  );
}
