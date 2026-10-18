/** Diagrams for the summary page. Static SVG, computed at build time from the run data, styled by theme tokens. */
import a4 from "@data/a4_test.json";
import an from "@data/analysis.json";
import e8 from "@data/e8.json";
import e9 from "@data/e9.json";

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const ring = (cx: number, cy: number, r: number, n: number, phase = -Math.PI / 2) =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos(phase + (2 * Math.PI * i) / n), cy + r * Math.sin(phase + (2 * Math.PI * i) / n)]);

type E8Row = { n: number; nu: number; T: number; tracking: number; benefit: number; cost: number };
const e8rows = e8.rows as E8Row[];
const e8cell = (n: number, nu: number, T: number) => {
  const sel = e8rows.filter((r) => r.n === n && r.nu === nu && r.T === T);
  return { tracking: mean(sel.map((r) => r.tracking)), benefit: mean(sel.map((r) => r.benefit)), cost: mean(sel.map((r) => r.cost)) };
};
const e8best = (n: number, nu: number) => (e8.temps as number[]).map((T) => ({ T, ...e8cell(n, nu, T) }))
  .reduce((a, b) => (b.benefit > a.benefit ? b : a));

function Arrow({ x1, y1, x2, y2, cls = "sm-arrow" }: { x1: number; y1: number; x2: number; y2: number; cls?: string }) {
  const a = Math.atan2(y2 - y1, x2 - x1), h = 7;
  return (
    <g className={cls}>
      <line x1={x1} y1={y1} x2={x2 - h * 0.8 * Math.cos(a)} y2={y2 - h * 0.8 * Math.sin(a)} />
      <path d={`M${x2},${y2} L${x2 - h * Math.cos(a - 0.45)},${y2 - h * Math.sin(a - 0.45)} L${x2 - h * Math.cos(a + 0.45)},${y2 - h * Math.sin(a + 0.45)} Z`} className="sm-head" />
    </g>
  );
}

/** Captions live with the page's <Figure>; the research-site captions kept here document what each drawing shows. */
function Wrap({ children, label, viewBox }: { children: React.ReactNode; label: string; caption?: React.ReactNode; viewBox: string }) {
  return (
    <div className="sm-figure">
      <div className="sm-scroll">
        <svg viewBox={viewBox} className="sm-svg" role="img" aria-label={label}>{children}</svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ one round */
const SCORES = [1.0, 0.55, 0.5, 0.45, 0.4];
const NAMES = ["s", "a", "b", "c", "d"];
const temper = (s: number[], T: number) => { const p = s.map((x) => x ** (1 / T)); const t = p.reduce((a, b) => a + b, 0); return p.map((x) => x / t); };
const OLD = [0.4, 0.2, 0.15, 0.15, 0.1];

function Bars({ x, y, w, h, vals, max = 1, cls, hi = 0, labels }: { x: number; y: number; w: number; h: number; vals: number[]; max?: number; cls: string; hi?: number; labels?: string[] }) {
  const bw = w / vals.length;
  return (
    <g>
      {vals.map((v, i) => (
        <g key={i}>
          <rect x={x + i * bw + 2} y={y + h - (v / max) * h} width={bw - 4} height={(v / max) * h} className={i === hi ? `${cls} sm-hi` : cls} />
          {labels && <text x={x + i * bw + bw / 2} y={y + h + 11} className="sm-tiny" textAnchor="middle">{labels[i]}</text>}
        </g>
      ))}
      <line x1={x} x2={x + w} y1={y + h} y2={y + h} className="sm-axis" />
    </g>
  );
}

export function RoundDiagram() {
  const low = temper(SCORES, 0.25), high = temper(SCORES, 1.0);
  const after = OLD.map((o, i) => (o + low[i]) / 2);
  const px = [8, 200, 392, 584], W = 168;
  const nodes = ring(px[0] + 84, 108, 40, 6);
  return (
    <Wrap viewBox="0 0 760 300" label="One round of the model in four steps"
      caption="One round. The same four steps repeat every time step, for every agent at once. Bars are one agent's view of the five agents it can listen to; s is the one closest to the news.">
      {px.map((x, i) => <rect key={i} x={x} y={28} width={W} height={214} rx={6} className="sm-panel" />)}
      {[0, 1, 2].map((i) => <Arrow key={i} x1={px[i] + W + 2} y1={126} x2={px[i + 1] - 2} y2={126} />)}
      <path d={`M${px[3] + W / 2},244 C${px[3] + W / 2},282 ${px[0] + W / 2},282 ${px[0] + W / 2},248`} className="sm-loop" />
      <text x={380} y={294} className="sm-small" textAnchor="middle">next step: the source may have moved, the next signal may be false</text>
      {["News appears", "Score the links", "Commit", "Blend with memory"].map((t, i) => (
        <text key={t} x={px[i] + 12} y={50} className="sm-h"><tspan className="sm-step">{i + 1}</tspan>  {t}</text>
      ))}
      {/* 1: network with source and a false alarm */}
      {nodes.map(([x, y], i) => nodes.slice(i + 1).map(([x2, y2], j) => (
        <line key={`${i}-${j}`} x1={x} y1={y} x2={x2} y2={y2} className="sm-faint" />)))}
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 0 ? 8 : 6} className={i === 0 ? "sm-source" : i === 3 ? "sm-false" : "sm-node"} />
      ))}
      <text x={nodes[0][0] + 12} y={nodes[0][1] + 4} className="sm-tiny">true source</text>
      <text x={nodes[3][0]} y={nodes[3][1] + 18} className="sm-tiny" textAnchor="middle">false alarm (prob. ν)</text>
      <text x={px[0] + 12} y={200} className="sm-small">The signal lands on the current</text>
      <text x={px[0] + 12} y={215} className="sm-small">source, or on a random agent.</text>
      {/* 2: scores */}
      <Bars x={px[1] + 22} y={70} w={124} h={80} vals={SCORES} cls="sm-bar" labels={NAMES} />
      <text x={px[1] + 12} y={186} className="sm-small">score = closeness to the</text>
      <text x={px[1] + 12} y={201} className="sm-small">news × current strength<tspan className="sm-sup" dy={-4}>κ</tspan></text>
      <text x={px[1] + 12} y={226} className="sm-tiny">κ: success breeds success</text>
      {/* 3: commit */}
      <Bars x={px[2] + 14} y={70} w={66} h={80} vals={low} cls="sm-bar-ss" labels={NAMES} />
      <Bars x={px[2] + 90} y={70} w={66} h={80} vals={high} cls="sm-bar" labels={NAMES} />
      <text x={px[2] + 47} y={66} className="sm-tiny" textAnchor="middle">low T</text>
      <text x={px[2] + 123} y={66} className="sm-tiny" textAnchor="middle">high T</text>
      <text x={px[2] + 12} y={186} className="sm-small">reward ∝ score<tspan className="sm-sup" dy={-4}>1/T</tspan></text>
      <text x={px[2] + 12} y={206} className="sm-small">Low T: bet hard on the best.</text>
      <text x={px[2] + 12} y={221} className="sm-small">High T: spread the reward.</text>
      {/* 4: blend */}
      <Bars x={px[3] + 14} y={70} w={66} h={80} vals={OLD} max={0.8} cls="sm-bar" labels={NAMES} />
      <Bars x={px[3] + 90} y={70} w={66} h={80} vals={after} max={0.8} cls="sm-bar-ss" labels={NAMES} />
      <text x={px[3] + 47} y={66} className="sm-tiny" textAnchor="middle">before</text>
      <text x={px[3] + 123} y={66} className="sm-tiny" textAnchor="middle">after</text>
      <text x={px[3] + 12} y={186} className="sm-small">new = (old + ε·reward)/(1 + ε)</text>
      <text x={px[3] + 12} y={206} className="sm-small">Attention always sums to 1.</text>
      <text x={px[3] + 12} y={221} className="sm-small">ε sets how fast it forgets.</text>
    </Wrap>
  );
}

/* ------------------------------------------------------------------ environment */
function lcg(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

export function EnvironmentDiagram() {
  const steps = 72, rnd = lcg(7);
  const truth = Array.from({ length: steps }, (_, t) => (t < 20 ? 0 : t < 47 ? 3 : 1));
  const seen = truth.map((s) => (rnd() < 0.3 ? Math.floor(rnd() * 6) : s));
  const x0 = 120, cw = 8.6;
  const row = (vals: number[], y: number, mark: boolean) => vals.map((v, t) => (
    <rect key={t} x={x0 + t * cw} y={y} width={cw - 1.2} height={26}
      className={`sm-n${v}${mark && v !== truth[t] ? " sm-wrong" : ""}`} />
  ));
  return (
    <Wrap viewBox="0 0 760 160" label="The environment: a moving source seen through noise"
      caption="The environment over 72 steps. Top: the true source, which stays put for a while (on average τ_E steps) and then moves. Bottom: where the news actually lands. Outlined cells are false alarms; here about 30% of steps, i.e. ν ≈ 0.3. Colours are agents.">
      <text x={10} y={56} className="sm-small">true source</text>
      <text x={10} y={98} className="sm-small">signal seen</text>
      {row(truth, 38, false)}
      {row(seen, 80, true)}
      <path d={`M${x0},30 L${x0},24 L${x0 + 20 * cw - 1},24 L${x0 + 20 * cw - 1},30`} className="sm-bracket" />
      <text x={x0 + 10 * cw} y={18} className="sm-tiny" textAnchor="middle">dwell ≈ τ_E</text>
      <text x={x0 + 34 * cw} y={18} className="sm-tiny" textAnchor="middle">the source moves</text>
      <Arrow x1={x0 + 34 * cw} y1={22} x2={x0 + 20 * cw + 2} y2={34} />
      <text x={x0} y={132} className="sm-tiny">Agents never see the top row. They only see the bottom row, one cell at a time.</text>
    </Wrap>
  );
}

/* ------------------------------------------------------------------ shapes */
function StarNet({ cx, cy, r, n = 6, hubCls = "sm-source", cycle = false, spread = false }: { cx: number; cy: number; r: number; n?: number; hubCls?: string; cycle?: boolean; spread?: boolean }) {
  const pts = ring(cx, cy, r, n);
  if (spread) {
    return (
      <g>
        {pts.map(([x, y], i) => pts.slice(i + 1).map(([x2, y2], j) => <line key={`${i}${j}`} x1={x} y1={y} x2={x2} y2={y2} className="sm-mid" />))}
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5.5} className="sm-node" />)}
      </g>
    );
  }
  return (
    <g>
      {pts.map(([x, y], i) => <line key={i} x1={cx} y1={cy} x2={x} y2={y} className="sm-strong" />)}
      {cycle && <path d={`M${pts[1][0]},${pts[1][1]} L${pts[2][0]},${pts[2][1]} L${pts[3][0]},${pts[3][1]} Z`} className="sm-cycle" />}
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5.5} className="sm-node" />)}
      <circle cx={cx} cy={cy} r={8} className={hubCls} />
    </g>
  );
}

export function ShapeDiagram() {
  const cells: [string, string, React.ReactNode][] = [
    ["Clean hierarchy", "T 0.88 · F 0.88 · O 0.88", <StarNet key="a" cx={130} cy={86} r={44} />],
    ["Hub with side loops", "T 0.88 · F 0.70 · O 0.76", <StarNet key="b" cx={380} cy={86} r={44} cycle />],
    ["Spread out", "T 0.62 · F 0.62 · O 0.62", <StarNet key="c" cx={630} cy={86} r={44} spread />],
  ];
  return (
    <Wrap viewBox="0 0 760 180" label="Three network shapes and their hierarchy coordinates"
      caption="Shape, read with three numbers between 0 and 1: treeness (does everything flow to a top?), feedforwardness (does it avoid loops?) and orderability (are nodes outside loops?). Values are typical runs; a weighted network is scored over 8 weight thresholds, so a perfect hub reads 0.88, not 1.">
      {cells.map(([t, v, net], i) => (
        <g key={t}>
          {net}
          <text x={130 + i * 250} y={152} className="sm-h" textAnchor="middle">{t}</text>
          <text x={130 + i * 250} y={170} className="sm-num" textAnchor="middle">{v}</text>
        </g>
      ))}
    </Wrap>
  );
}

/* ------------------------------------------------------------------ regimes */
export function RegimeDiagram() {
  const n = 40, nu = 0.25;
  const th = (e8.T_half as Record<string, number>)[String(n)];
  const zones = [
    { T: 0.15, cls: "sm-zone-ob", title: "Lock-in" },
    { T: 0.25, cls: "sm-zone-hi", title: "Coordinated hierarchy" },
    { T: 0.8, cls: "sm-zone-di", title: "Spread out" },
  ].map((z) => ({ ...z, ...e8cell(n, nu, z.T) }));
  const X = [20, 270, 520], W = 230;
  const fmtB = (b: number) => (b / Math.log(n - 1) < -1 ? "≪ 0" : `${Math.round((100 * b) / Math.log(n - 1))}%`);
  return (
    <Wrap viewBox="0 0 760 330" label="Three regimes along the commitment axis, with measured cost and benefit"
      caption={`Three regimes along one axis, commitment (the temperature T). Numbers are measured: ${n} agents, source moves every ${e8.tau_E} steps on average, ν = ${nu}, κ = ${e8.kappa}, at T = 0.15, 0.25 and 0.8. Benefit is the share of the best possible; cost is relative to everyone listening to everyone.`}>
      {zones.map((z, i) => <rect key={i} x={X[i]} y={10} width={W} height={250} rx={6} className={z.cls} />)}
      {zones.map((z, i) => (
        <g key={`t${i}`}>
          <text x={X[i] + W / 2} y={34} className="sm-h" textAnchor="middle">{z.title}</text>
          {i === 0 && <><StarNet cx={X[i] + W / 2} cy={100} r={40} hubCls="sm-stale" />
            <circle cx={X[i] + W / 2 + 40 * Math.cos(-Math.PI / 2 + (2 * Math.PI * 2) / 6)} cy={100 + 40 * Math.sin(-Math.PI / 2 + (2 * Math.PI * 2) / 6)} r={7} className="sm-source" /></>}
          {i === 1 && <StarNet cx={X[i] + W / 2} cy={100} r={40} />}
          {i === 2 && <StarNet cx={X[i] + W / 2} cy={100} r={40} spread />}
          <text x={X[i] + 16} y={170} className="sm-num">tracking the source</text>
          <text x={X[i] + W - 16} y={170} className="sm-num sm-strongnum" textAnchor="end">{z.tracking.toFixed(2)}</text>
          <text x={X[i] + 16} y={190} className="sm-num">benefit</text>
          <text x={X[i] + W - 16} y={190} className="sm-num sm-strongnum" textAnchor="end">{fmtB(z.benefit)}</text>
          <text x={X[i] + 16} y={210} className="sm-num">structural cost</text>
          <text x={X[i] + W - 16} y={210} className="sm-num sm-strongnum" textAnchor="end">{z.cost.toFixed(2)}×</text>
          <text x={X[i] + W / 2} y={240} className="sm-small" textAnchor="middle">
            {i === 0 ? "Everyone bets on a stale hub." : i === 1 ? "The hub is the source, and follows it." : "No one commits; little gained, little paid."}
          </text>
        </g>
      ))}
      <line x1={20} x2={750} y1={290} y2={290} className="sm-axis" />
      <Arrow x1={385} y1={290} x2={750} y2={290} />
      <Arrow x1={385} y1={290} x2={20} y2={290} />
      <line x1={260} x2={260} y1={262} y2={298} className="sm-mark" />
      <line x1={510} x2={510} y1={262} y2={298} className="sm-mark" />
      <text x={260} y={314} className="sm-num" textAnchor="middle">T = κ</text>
      <text x={510} y={314} className="sm-num" textAnchor="middle">T½ = {th.toFixed(2)}</text>
      <text x={24} y={314} className="sm-small">commit harder</text>
      <text x={746} y={314} className="sm-small" textAnchor="end">spread more</text>
    </Wrap>
  );
}

/* ------------------------------------------------------------------ scaling with size and noise */
export function ScalingDiagram() {
  const ns = e8.ns as number[];
  const nus = [0, 0.5, 0.75];
  const cls = ["sm-l0", "sm-l1", "sm-l2"];
  const lx = (n: number, x0: number, w: number) => x0 + ((Math.log(n) - Math.log(10)) / (Math.log(80) - Math.log(10))) * w;
  const panel = (x0: number, title: string, yMin: number, yMax: number, ticks: number[], val: (n: number, nu: number) => number, maxLine?: (n: number) => number) => {
    const w = 270, y0 = 40, h = 150;
    const ly = (v: number) => y0 + h - ((v - yMin) / (yMax - yMin)) * h;
    return (
      <g>
        <text x={x0} y={22} className="sm-h">{title}</text>
        {ticks.map((t) => <g key={t}><line x1={x0} x2={x0 + w} y1={ly(t)} y2={ly(t)} className="sm-grid" />
          <text x={x0 - 6} y={ly(t) + 4} className="sm-tiny" textAnchor="end">{t}</text></g>)}
        {ns.map((n) => <text key={n} x={lx(n, x0, w)} y={y0 + h + 16} className="sm-tiny" textAnchor="middle">{n}</text>)}
        <text x={x0 + w} y={y0 + h + 32} className="sm-tiny" textAnchor="end">group size N →</text>
        {maxLine && <polyline points={ns.map((n) => `${lx(n, x0, w)},${ly(maxLine(n))}`).join(" ")} className="sm-dash" />}
        {maxLine && <text x={lx(80, x0, w) + 4} y={ly(maxLine(80)) - 6} className="sm-tiny" textAnchor="end">most possible</text>}
        {nus.map((nu, k) => (
          <g key={nu}>
            <polyline points={ns.map((n) => `${lx(n, x0, w)},${ly(val(n, nu))}`).join(" ")} className={`sm-line ${cls[k]}`} />
            {ns.map((n) => <circle key={n} cx={lx(n, x0, w)} cy={ly(val(n, nu))} r={3} className={`sm-dot ${cls[k]}`} />)}
          </g>
        ))}
      </g>
    );
  };
  return (
    <Wrap viewBox="0 0 760 250" label="Benefit and cost of coordination against group size, for three noise levels"
      caption="At each group size and noise level, the best commitment T was chosen. Benefit (nats) rises with group size like ln(N − 1); structural cost stays near 2× whatever the size. Heavy noise lowers both: the group commits less, gains less and pays less.">
      {panel(50, "Benefit (nats)", 0, 4.5, [0, 1, 2, 3, 4], (n, nu) => e8best(n, nu).benefit, (n) => Math.log(n - 1))}
      {panel(450, "Structural cost (× uniform)", 1, 2.2, [1, 1.4, 1.8, 2.2], (n, nu) => e8best(n, nu).cost)}
      {nus.map((nu, k) => (
        <g key={nu}>
          <line x1={180 + k * 82} x2={200 + k * 82} y1={18} y2={18} className={`sm-line ${cls[k]}`} />
          <text x={204 + k * 82} y={22} className="sm-tiny">ν = {nu}</text>
        </g>
      ))}
    </Wrap>
  );
}

/* ------------------------------------------------------------------ the window */
export function WindowDiagram() {
  const rows = an.t_half.rows as { n: number; nu: number; closed: number; relay: number | null; sim: number | null }[];
  const ns = e8.ns as number[];
  const kappa = e8.kappa;
  const x0 = 110, w = 600, tMin = 0.15, tMax = 0.6;
  const lx = (t: number) => x0 + ((t - tMin) / (tMax - tMin)) * w;
  const nuCls = ["sm-w0", "sm-w1", "sm-w2", "sm-w3"];
  return (
    <Wrap viewBox="0 0 760 250" label="The range of commitment that coordinates, by group size and noise"
      caption="The usable range of commitment: from the lock-in edge (T = κ) to where tracking falls below one half. Each bar is one group size, with one shade per noise level (lightest: perfect signal). Bigger groups and noisier signals both leave a narrower range. Measured values; at ν = 0.75 for 40 and 80 agents the end comes from the reduced model, because the runs never reached one half.">
      <rect x={lx(tMin)} y={20} width={lx(kappa) - lx(tMin)} height={170} className="sm-zone-ob" />
      <text x={(lx(tMin) + lx(kappa)) / 2} y={36} className="sm-tiny" textAnchor="middle">lock-in</text>
      {ns.map((n, i) => {
        const y = 48 + i * 36;
        return (
          <g key={n}>
            <text x={x0 - 12} y={y + 15} className="sm-num" textAnchor="end">N = {n}</text>
            {[0, 0.25, 0.5, 0.75].map((nu, k) => {
              const r = rows.find((q) => q.n === n && q.nu === nu)!;
              const end = nu === 0 ? r.closed : (r.sim ?? r.relay);
              if (end === null) return null;
              return <rect key={nu} x={lx(kappa)} y={y + k * 1.5} width={lx(end) - lx(kappa)} height={22 - k * 3} className={nuCls[k]} />;
            })}
          </g>
        );
      })}
      {[0.2, 0.3, 0.4, 0.5, 0.6].map((t) => (
        <g key={t}><line x1={lx(t)} x2={lx(t)} y1={192} y2={198} className="sm-axis" />
          <text x={lx(t)} y={212} className="sm-tiny" textAnchor="middle">{t}</text></g>
      ))}
      <line x1={x0} x2={x0 + w} y1={192} y2={192} className="sm-axis" />
      <text x={x0 + w} y={232} className="sm-tiny" textAnchor="end">temperature T (commit harder ←)</text>
      {["ν = 0", "0.25", "0.5", "0.75"].map((l, k) => (
        <g key={l}><rect x={110 + k * 70} y={222} width={14} height={10} className={nuCls[k]} />
          <text x={128 + k * 70} y={231} className="sm-tiny">{l}</text></g>
      ))}
    </Wrap>
  );
}

/* ------------------------------------------------------------------ why the hub survives noise */
export function MechanismDiagram() {
  const eq = [0.06, 0.06, 0.06, 0.06, 0.06], un = [0.2, 0.05, 0.03, 0.01, 0.01];
  const pull = (w: number[]) => w.reduce((a, x) => a + x ** 0.8, 0);
  const row = (a4.rows as Record<string, number>[]).find((r) => r.n === 10 && r.nu === 0.5 && r.T === 0.25)!;
  const avg = (an.mean_field.rows as { n: number; nu: number; T: number; averaged: number }[]).find((r) => r.n === 10 && r.nu === 0.5 && r.T === 0.25)!.averaged;
  const bars: [string, number][] = [["full model", row.rwed], ["rivals made equal", row.rwed_sym], ["… and no relays", row.likelihood_sym], ["averaged theory", avg]];
  const hub = [400, 92], j = [470, 150];
  const others = ring(400, 92, 52, 6).filter((_, i) => i !== 2);
  return (
    <Wrap viewBox="0 0 760 250" label="Why coordination survives noise: uneven rivals and relays"
      caption={`Why the hub keeps its place near the lock-in edge despite false alarms. Left: false alarms leave the leftover attention on a few recent rivals, and rivals with uneven weight pull less in total (score ∝ weight^κ/T, a concave curve). Middle: news from a false alarm still passes through the hub. Right: tracking at 10 agents, ν = 0.5, T = 0.25, removing one effect at a time.`}>
      <text x={20} y={22} className="sm-h">Uneven rivals pull less</text>
      <Bars x={24} y={50} w={110} h={90} vals={eq} max={0.22} cls="sm-bar" />
      <Bars x={160} y={50} w={110} h={90} vals={un} max={0.22} cls="sm-bar-ss" />
      <text x={79} y={44} className="sm-tiny" textAnchor="middle">equal rivals</text>
      <text x={215} y={44} className="sm-tiny" textAnchor="middle">uneven rivals</text>
      <text x={79} y={162} className="sm-num" textAnchor="middle">total pull {pull(eq).toFixed(2)}</text>
      <text x={215} y={162} className="sm-num" textAnchor="middle">total pull {pull(un).toFixed(2)}</text>
      <text x={20} y={190} className="sm-small">Same leftover attention (0.3), 9% less pull</text>
      <text x={20} y={204} className="sm-small">against the source.</text>

      <text x={330} y={22} className="sm-h">Relays</text>
      {others.map(([x, y], i) => <line key={i} x1={hub[0]} y1={hub[1]} x2={x} y2={y} className="sm-strong" />)}
      {others.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5} className="sm-node" />)}
      <circle cx={j[0]} cy={j[1]} r={6.5} className="sm-false" />
      <Arrow x1={j[0] - 6} y1={j[1] - 6} x2={hub[0] + 9} y2={hub[1] + 9} cls="sm-arrow sm-arrow-acc" />
      <circle cx={hub[0]} cy={hub[1]} r={9} className="sm-source" />
      <text x={j[0] + 10} y={j[1] + 14} className="sm-tiny">false alarm</text>
      <text x={330} y={190} className="sm-small">Everyone listens to the hub, so it is</text>
      <text x={330} y={204} className="sm-small">the closest relay even to false news.</text>

      <text x={560} y={22} className="sm-h">Tracking, one effect at a time</text>
      {bars.map(([l, v], i) => (
        <g key={l}>
          <text x={560} y={52 + i * 36} className="sm-tiny">{l}</text>
          <rect x={560} y={56 + i * 36} width={v * 180} height={12} className={i === 0 ? "sm-bar-ss" : "sm-bar"} />
          <text x={566 + v * 180} y={66 + i * 36} className="sm-num">{v.toFixed(2)}</text>
        </g>
      ))}
    </Wrap>
  );
}

/* ------------------------------------------------------------------ position vs evidence */
export function RulesDiagram() {
  type R = { rule: string; n: number; nu: number; T: number | null; benefit: number };
  const rows = e9.rows as R[];
  const temps = e9.temps as number[];
  const n = 80;
  const val = (rule: string, nu: number) => {
    const m = (T: number | null) => mean(rows.filter((r) => r.rule === rule && r.n === n && r.nu === nu && (rule === "bayes" || r.T === T)).map((r) => r.benefit));
    return (rule === "bayes" ? m(null) : Math.max(...temps.map(m))) / Math.log(n - 1);
  };
  const rules: [string, string, string][] = [["rwed", "reward position", "sm-bar-ss"], ["lik-rho", "reward evidence", "sm-bar-nl"],
    ["lik-bayes", "evidence, noise-tuned", "sm-bar"], ["bayes", "ideal statistician", "sm-bar-ink"]];
  const mini = (cx: number, credit: "hub" | "j", title: string, sub: string) => {
    const pts = ring(cx, 100, 46, 6);
    const jx = pts[2];
    return (
      <g>
        <text x={cx} y={28} className="sm-h" textAnchor="middle">{title}</text>
        {pts.map(([x, y], i) => <line key={i} x1={cx} y1={100} x2={x} y2={y} className="sm-strong" />)}
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === 2 ? 7 : 5} className={i === 2 ? (credit === "j" ? "sm-credit" : "sm-false") : "sm-node"} />)}
        <circle cx={cx} cy={100} r={9} className={credit === "hub" ? "sm-credit" : "sm-source"} />
        <text x={jx[0] + 10} y={jx[1] + 4} className="sm-tiny">false alarm</text>
        <text x={cx} y={176} className="sm-small" textAnchor="middle">{sub}</text>
      </g>
    );
  };
  return (
    <Wrap viewBox="0 0 760 250" label="Two ways to reward a link, and how much each recovers"
      caption={`Two ways an agent can decide whom to listen to, after a false alarm (highlighted ring = who gets the credit). Rewarding position credits whoever is closest to the news, which after a false alarm is still the hub. Rewarding evidence credits only the agent where the news appeared. Right: benefit at the best commitment, ${n} agents, as a share of the most possible; the ideal statistician knows the noise level and the pace and uses all past signals.`}>
      {mini(90, "hub", "Reward position", "the hub keeps credit")}
      {mini(270, "j", "Reward evidence", "the false alarm gets it")}
      {[0.5, 0.75].map((nu, k) => (
        <g key={nu}>
          <text x={420 + k * 170} y={28} className="sm-h">ν = {nu}</text>
          {rules.map(([r, l, c], i) => {
            const v = val(r, nu);
            return (
              <g key={r}>
                <rect x={420 + k * 170} y={44 + i * 44} width={v * 130} height={14} className={c} />
                <text x={420 + k * 170} y={40 + i * 44} className="sm-tiny">{l}</text>
                <text x={424 + k * 170 + v * 130} y={56 + i * 44} className="sm-num">{Math.round(100 * v)}%</text>
              </g>
            );
          })}
        </g>
      ))}
    </Wrap>
  );
}

/* ------------------------------------------------------------------ how a study runs */
export function PipelineDiagram() {
  const boxes: [string, string[]][] = [
    ["Choose a grid", ["group size, noise,", "commitment, …", "2–4 random seeds each"]],
    ["Run every cell", ["random starting attention;", "a fresh environment draw;", "3000–4000 rounds, in parallel"]],
    ["Record", ["tracking, benefit, cost,", "shape, every 300 rounds;", "average the second half"]],
    ["Compare", ["with exact formulas,", "reduced models, and", "switched-off variants"]],
  ];
  const W = 168, X = [8, 200, 392, 584];
  return (
    <Wrap viewBox="0 0 760 140" label="How each study runs"
      caption="Every study follows the same four steps. What changes from study to study is the grid (what is varied) and the comparison (what it is tested against).">
      {boxes.map(([t, lines], i) => (
        <g key={t}>
          <rect x={X[i]} y={10} width={W} height={110} rx={6} className="sm-panel" />
          <text x={X[i] + 12} y={34} className="sm-h"><tspan className="sm-step">{i + 1}</tspan>  {t}</text>
          {lines.map((l, k) => <text key={k} x={X[i] + 12} y={60 + k * 16} className="sm-small">{l}</text>)}
          {i < 3 && <Arrow x1={X[i] + W + 2} y1={65} x2={X[i + 1] - 2} y2={65} />}
        </g>
      ))}
    </Wrap>
  );
}

/** Small factor-grid picture for an experiment card: cols × rows of dots, `layers` offset copies behind. */
export function FactorGrid({ cols, rows, layers = 1, colLabel, rowLabel, layerLabel, split }: {
  cols: number; rows: number; layers?: number; colLabel: string; rowLabel: string; layerLabel?: string; split?: [string, string, string, string] }) {
  const w = 150, h = 70, x0 = 44, y0 = 18;
  const dx = Math.min(w / cols, 16), dy = Math.min(h / rows, 16);
  return (
    <svg viewBox="0 0 240 124" className="sm-card-svg" role="img" aria-label={`${cols} by ${rows} grid${layers > 1 ? `, ${layers} layers` : ""}`}>
      {split ? (
        <g>
          {split.map((l, i) => (
            <g key={l}>
              <rect x={26 + (i % 2) * 106} y={y0 + Math.floor(i / 2) * 42} width={102} height={38} rx={4} className={i === 0 ? "sm-cell-hi" : "sm-cell"} />
              <text x={26 + (i % 2) * 106 + 51} y={y0 + Math.floor(i / 2) * 42 + 23} className="sm-tiny" textAnchor="middle">{l}</text>
            </g>
          ))}
        </g>
      ) : (
        Array.from({ length: layers }, (_, L) => layers - 1 - L).map((L) => (
          <g key={L} transform={`translate(${L * 7},${-L * 5})`} className={L === 0 ? "" : "sm-layer"}>
            {Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => (
              <circle key={`${r}-${c}`} cx={x0 + c * dx + dx / 2} cy={y0 + 12 + r * dy + dy / 2} r={2.6} className="sm-griddot" />
            )))}
          </g>
        ))
      )}
      <text x={x0 + 75} y={116} className="sm-tiny" textAnchor="middle">{colLabel}</text>
      <text x={14} y={y0 + 50} className="sm-tiny" textAnchor="middle" transform={`rotate(-90 14 ${y0 + 50})`}>{rowLabel}</text>
      {layerLabel && <text x={236} y={14} className="sm-tiny" textAnchor="end">{layerLabel}</text>}
    </svg>
  );
}
