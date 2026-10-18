/** One round of the model, worked step by step on six agents (A–F) with the numbers the equations produce
 *  (lib/roundExample.ts). Each slide draws the network with that step's flow highlighted and explains what flows
 *  where, and how, underneath. Server-rendered; StepCarousel switches between the slides. */
import { example, FOCUS, NAMES, PARAMS, SOURCE } from "../../lib/roundExample";
import StepCarousel, { type Step } from "../ui/StepCarousel";
import Tex from "../ui/Tex";

const ex = example();
const n = NAMES.length;
const { kappa, T, eps, rho, delta } = PARAMS;
const fx = (x: number, d = 2) => x.toFixed(d);
const S_raw = (k: number, i: number) => (k === i ? 0 : Math.pow(ex.D[k], kappa - 1) * Math.pow(ex.A0[k][i], kappa));

/* ------------------------------------------------------------------ network drawing */
const W = 300, H = 296, cx = 150, cy = 140, R = 100, NODE_R = 15;
const pos = NAMES.map((_, j) => {
  const a = -Math.PI / 2 - (2 * Math.PI * j) / n;
  return [cx + R * Math.cos(a), cy + R * Math.sin(a)] as const;
});

type EdgeStyle = { w: number; tone: "src" | "focus" | "plain" | "faint"; label?: string };
type NodeStyle = { tone?: "src" | "focus" | "false"; note?: string };

/** Curved arrow k → i (news flows from speaker k to listener i), offset so k → i and i → k do not overlap. */
function edgePath(k: number, i: number) {
  const [x1, y1] = pos[k], [x2, y2] = pos[i];
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux, bend = 13;
  const sx = x1 + ux * NODE_R + nx * 4, sy = y1 + uy * NODE_R + ny * 4;
  const ex2 = x2 - ux * (NODE_R + 3) + nx * 4, ey2 = y2 - uy * (NODE_R + 3) + ny * 4;
  const mx = (x1 + x2) / 2 + nx * bend, my = (y1 + y2) / 2 + ny * bend;
  return { d: `M${sx},${sy} Q${mx},${my} ${ex2},${ey2}`, lx: (sx + 2 * mx + ex2) / 4, ly: (sy + 2 * my + ey2) / 4 };
}

function Network({ id, edges, nodes, caption }: { id: string; edges: (k: number, i: number) => EdgeStyle | null; nodes?: (j: number) => NodeStyle; caption?: string }) {
  const list: { k: number; i: number; s: EdgeStyle }[] = [];
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) { if (k === i) continue; const s = edges(k, i); if (s) list.push({ k, i, s }); }
  const order = { faint: 0, plain: 1, focus: 2, src: 3 };
  list.sort((a, b) => order[a.s.tone] - order[b.s.tone]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="rx-net" role="img" aria-label={caption ?? "Six agents and their attention links"}>
      <defs>
        {/* one arrowhead per edge, sized to its width, so thick links still show their direction */}
        {list.map(({ k, i, s }) => {
          const size = 7 + 1.5 * Math.max(0.6, s.w);
          return (
            <marker key={`m${k}-${i}`} id={`${id}-h-${k}-${i}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth={size} markerHeight={size}
              markerUnits="userSpaceOnUse" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className={`rx-head rx-${s.tone}`} />
            </marker>
          );
        })}
      </defs>
      {list.map(({ k, i, s }) => {
        const p = edgePath(k, i);
        return <path key={`${k}-${i}`} d={p.d} className={`rx-edge rx-${s.tone}`} strokeWidth={Math.max(0.6, s.w)} markerEnd={`url(#${id}-h-${k}-${i})`} />;
      })}
      {list.filter((e) => e.s.label).map(({ k, i, s }) => {
        const p = edgePath(k, i);
        return <text key={`l${k}-${i}`} x={p.lx} y={p.ly + 3.5} className={`rx-label rx-${s.tone}`} textAnchor="middle">{s.label}</text>;
      })}
      {NAMES.map((name, j) => {
        const st = nodes?.(j) ?? {};
        const [x, y] = pos[j];
        const out = [x + (x - cx) * 0.36, y + (y - cy) * 0.36];
        return (
          <g key={name}>
            <circle cx={x} cy={y} r={NODE_R} className={`rx-node ${st.tone ? `rx-node-${st.tone}` : ""}`} />
            <text x={x} y={y + 4.5} className="rx-name" textAnchor="middle">{name}</text>
            {st.note && <text x={out[0]} y={out[1] + 4} className="rx-note" textAnchor="middle">{st.note}</text>}
          </g>
        );
      })}
    </svg>
  );
}

const width = (a: number) => 0.6 + 9 * a;
const nm = (k: number) => NAMES[k];
const E = FOCUS, A = SOURCE;

function Slide({ net, children }: { net: React.ReactNode; children: React.ReactNode }) {
  return <div className="rx-slide"><div className="rx-pic">{net}</div><div className="rx-text">{children}</div></div>;
}

/* ------------------------------------------------------------------ the steps */
const steps: Step[] = [
  {
    key: "state", label: "State",
    node: (
      <Slide net={<Network id="s0" edges={(k, i) => ({ w: width(ex.A0[k][i]), tone: i === E ? "focus" : "plain", label: i === E ? fx(ex.A0[k][i]) : undefined })}
        nodes={(j) => (j === E ? { tone: "focus", note: "listener" } : {})} />}>
        <p><b>Who listens to whom.</b> Each agent splits one unit of attention among the others. The arrow{" "}
          <Tex>{"k \\to i"}</Tex> is the channel through which news reaches <Tex>i</Tex> from <Tex>k</Tex>; its width is{" "}
          <Tex>{"A_{ki}"}</Tex>, the share of <Tex>i</Tex>&apos;s attention on <Tex>k</Tex>.</p>
        <Tex block>{"\\sum_{k\\neq i} A_{ki} = 1 \\qquad\\text{for every listener } i"}</Tex>
        <p>We follow one listener, <b>{nm(E)}</b> (highlighted). Its attention starts spread:{" "}
          {NAMES.map((k, j) => (j === E ? null : <span key={k} className="rx-chip">{k} {fx(ex.A0[j][E])}</span>))}.</p>
      </Slide>
    ),
  },
  {
    key: "news", label: "News",
    node: (
      <Slide net={<Network id="s1" edges={(k, i) => ({ w: width(ex.A0[k][i]), tone: "faint" })}
        nodes={(j) => (j === A ? { tone: "src", note: "news" } : j === E ? { tone: "focus" } : {})} />}>
        <p><b>News appears at one agent.</b> This round it lands on <b>{nm(A)}</b>. It is the true source with
          probability <Tex>{"1-\\nu"}</Tex>; otherwise it is a false alarm at a random agent. Nobody can tell which.</p>
        <Tex block>{"s_t = \\begin{cases}\\text{true source} & \\text{prob. } 1-\\nu\\\\ \\text{random agent} & \\text{prob. } \\nu\\end{cases}\\qquad s_t = \\mathrm{" + nm(A) + "}"}</Tex>
        <p>Everything that follows is measured from <Tex>s_t</Tex>.</p>
      </Slide>
    ),
  },
  {
    key: "flow", label: "Flow",
    node: (
      <Slide net={<Network id="s2"
        edges={(k, i) => (k === A ? { w: width(ex.P[A][i]), tone: "src", label: fx(ex.P[A][i]) } : { w: width(ex.A0[k][i]) * 0.6, tone: "faint" })}
        nodes={(j) => ({ tone: j === A ? "src" : j === E ? "focus" : undefined, note: `D ${fx(ex.D[j], 1)}` })} />}>
        <p><b>How close is everyone to the news?</b> The news spreads from {nm(A)} as a random walk along the listening
          links. From {nm(A)} it steps to <Tex>k</Tex> with probability equal to <Tex>k</Tex>&apos;s share of{" "}
          {nm(A)}&apos;s audience (labels on the orange arrows):</p>
        <Tex block>{"P_{sk} = \\frac{A_{sk}}{\\sum_j A_{sj}},\\qquad Z = \\big(I - e^{-\\delta}P\\big)^{-1},\\qquad D_{sk} = -\\ln\\frac{Z_{sk}}{Z_{kk}}"}</Tex>
        <p>Every step costs <Tex>{`\\delta = ${delta}`}</Tex>, so the direct step dominates:{" "}
          <Tex>{"D_{sk}\\approx \\delta - \\ln P_{sk}"}</Tex>. The largest share of {nm(A)}&apos;s audience is the closest
          relay. {nm(A)} itself gets the closest relay distance divided by <Tex>{`\\rho = ${rho}`}</Tex>:</p>
        <Tex block>{`D_{ss} = \\min_k D_{sk}/\\rho = ${fx(ex.minRelay)}/${rho} = ${fx(ex.D[A])}`}</Tex>
      </Slide>
    ),
  },
  {
    key: "score", label: "Score",
    node: (
      <Slide net={<Network id="s3"
        edges={(k, i) => (i === E ? { w: width(S_raw(k, E) * 2.2), tone: k === A ? "src" : "focus", label: fx(S_raw(k, E)) } : { w: 0.5, tone: "faint" })}
        nodes={(j) => ({ tone: j === A ? "src" : j === E ? "focus" : undefined, note: j === E ? undefined : `D ${fx(ex.D[j], 1)}` })} />}>
        <p><b>{nm(E)} scores each incoming link</b> by the sender&apos;s closeness to the news and by how much it already
          listens to that sender:</p>
        <Tex block>{"S_{kE} = D_k^{\\,\\kappa-1}\\,A_{kE}^{\\,\\kappa}\\qquad(\\kappa = " + kappa + ")"}</Tex>
        <Tex block>{`S_{\\mathrm{${nm(A)}}E} = ${fx(ex.D[A])}^{${fx(kappa - 1, 1)}}\\cdot ${fx(ex.A0[A][E])}^{${kappa}} = ${fx(S_raw(A, E))},\\qquad S_{\\mathrm{${nm(3)}}E} = ${fx(ex.D[3])}^{${fx(kappa - 1, 1)}}\\cdot ${fx(ex.A0[3][E])}^{${kappa}} = ${fx(S_raw(3, E))}`}</Tex>
        <p>The first factor favours whoever is close to the news, the second whoever {nm(E)} already listens to:
          self-reinforcement. (Scaling all distances by a common factor changes nothing below.)</p>
      </Slide>
    ),
  },
  {
    key: "commit", label: "Commit",
    node: (
      <Slide net={<Network id="s4"
        edges={(k, i) => (i === E ? { w: width(ex.R[k][E]), tone: k === A ? "src" : "focus", label: fx(ex.R[k][E]) } : { w: 0.5, tone: "faint" })}
        nodes={(j) => ({ tone: j === A ? "src" : j === E ? "focus" : undefined })} />}>
        <p><b>{nm(E)} turns scores into rewards</b>, sharpened by the commitment temperature{" "}
          <Tex>{`T = ${T}`}</Tex>. A low <Tex>T</Tex> sends almost everything to the best link:</p>
        <Tex block>{"r_{kE} = \\frac{S_{kE}^{1/T}}{\\sum_j S_{jE}^{1/T}}"}</Tex>
        <Tex block>{`r_{\\mathrm{${nm(A)}}E} = ${fx(ex.R[A][E])}\\qquad\\text{while } S_{\\mathrm{${nm(A)}}E}/S_{\\mathrm{${nm(3)}}E} = ${fx(S_raw(A, E) / S_raw(3, E))}\\ \\Rightarrow\\ (\\cdot)^{1/T} = ${fx(Math.pow(S_raw(A, E) / S_raw(3, E), 1 / T), 1)}`}</Tex>
        <p>A score twice as high earns about <Tex>{`2^{1/${T}}\\approx ${fx(Math.pow(2, 1 / T), 0)}`}</Tex> times the reward.</p>
      </Slide>
    ),
  },
  {
    key: "blend", label: "Blend",
    node: (
      <Slide net={<Network id="s5"
        edges={(k, i) => ({ w: width(ex.next[k][i]), tone: i === E ? (k === A ? "src" : "focus") : "plain", label: i === E ? fx(ex.next[k][i]) : undefined })}
        nodes={(j) => ({ tone: j === A ? "src" : j === E ? "focus" : undefined })} />}>
        <p><b>{nm(E)} blends the reward into its attention</b> with memory <Tex>{`\\varepsilon = ${eps}`}</Tex>: half old,
          half new. Its attention still sums to one.</p>
        <Tex block>{"A_{kE} \\leftarrow \\frac{A_{kE} + \\varepsilon\\, r_{kE}}{1+\\varepsilon}"}</Tex>
        <Tex block>{`A_{\\mathrm{${nm(A)}}E}:\\ \\frac{${fx(ex.A0[A][E])} + ${fx(ex.R[A][E])}}{2} = ${fx(ex.next[A][E])}`}</Tex>
        <p>Every agent does the same at once; the picture shows the whole network after this one round. Links from {nm(A)} to its
          listeners have grown everywhere.</p>
      </Slide>
    ),
  },
  {
    key: "repeat", label: "Repeat",
    node: (
      <Slide net={<Network id="s6" edges={(k, i) => (ex.after30[k][i] > 0.02 ? { w: width(ex.after30[k][i]), tone: k === A ? "src" : "plain" } : null)}
        nodes={(j) => ({ tone: j === A ? "src" : undefined, note: j === A ? "hub" : undefined })} />}>
        <p><b>Thirty rounds later</b>, with the news always at {nm(A)}, everyone listens to {nm(A)}: a hub. The share of
          attention on the source goes</p>
        <Tex block>{`${fx(ex.tracking[0])}\\ \\text{(round 1)}\\ \\to\\ ${fx(ex.tracking[4])}\\ \\text{(round 5)}\\ \\to\\ ${fx(ex.tracking[29])}\\ \\text{(round 30)}`}</Tex>
        <p>That needs <Tex>{"\\kappa < T < T_{1/2}"}</Tex>; here <Tex>{`\\kappa = ${kappa} < T = ${T} < T_{1/2} = ${fx(kappa + (1 - kappa) * Math.log(rho) / Math.log(n - 2))}`}</Tex>.
          When the source moves, the hub has to follow it; that is where the rest of the story starts.</p>
      </Slide>
    ),
  },
];

export default function RoundExample() {
  return <StepCarousel items={steps} label="One round of the model, step by step" />;
}
