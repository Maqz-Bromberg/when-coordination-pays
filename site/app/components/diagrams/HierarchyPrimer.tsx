/** A graphic introduction to hierarchy coordinates (Corominas-Murtra et al. 2013): six toy networks and where they sit
 *  in the (T, F, O) cube, next to the point a weighted hub reaches in this model. The toy coordinates were computed
 *  with nichenet.metrics.hierarchy (variant "corominas", unweighted). Static SVG, styled by theme tokens. */

type Pt = [number, number];
type Toy = { title: string; values: string; nodes: Pt[]; edges: [number, number][]; loop?: [number, number][] };

const ring = (cx: number, cy: number, r: number, n: number, phase = -90): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = ((phase + (360 * i) / n) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });

const STAR: Pt[] = [[75, 60], ...ring(75, 60, 44, 5, -162)];
const TOYS: Toy[][] = [
  [
    { title: "Pyramid", values: "T 1 · F 1 · O 1",
      nodes: [[75, 12], [40, 58], [110, 58], [20, 104], [60, 104], [90, 104], [130, 104]],
      edges: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]] },
    { title: "Inverted pyramid", values: "T −1 · F 1 · O 1",
      nodes: [[75, 104], [40, 58], [110, 58], [20, 12], [60, 12], [90, 12], [130, 12]],
      edges: [[3, 1], [4, 1], [5, 2], [6, 2], [1, 0], [2, 0]] },
    { title: "Funnel and fan", values: "T 0 · F 1 · O 1",
      nodes: [[40, 12], [110, 12], [75, 58], [40, 104], [110, 104]],
      edges: [[0, 2], [1, 2], [2, 3], [2, 4]] },
  ],
  [
    { title: "Hub", values: "T 1 · F 1 · O 1", nodes: STAR, edges: [1, 2, 3, 4, 5].map((i) => [0, i] as [number, number]) },
    { title: "Hub with a loop", values: "T 1 · F 0.83 · O 0.50", nodes: STAR,
      edges: [1, 2, 3, 4, 5].map((i) => [0, i] as [number, number]), loop: [[1, 2], [2, 3], [3, 1]] },
    { title: "Ring", values: "T 0 · F 0 · O 0", nodes: ring(75, 60, 42, 5), edges: [],
      loop: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]] },
  ],
];

const NODE_R = 6;

function Edge({ a, b, cls }: { a: Pt; b: Pt; cls: string }) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  const x1 = a[0] + ux * NODE_R, y1 = a[1] + uy * NODE_R, x2 = b[0] - ux * (NODE_R + 1), y2 = b[1] - uy * (NODE_R + 1);
  const h = 7, ang = Math.atan2(uy, ux);
  const bx = x2 - h * 0.8 * ux, by = y2 - h * 0.8 * uy;
  return (
    <g className={cls}>
      <line x1={x1} y1={y1} x2={bx} y2={by} />
      <path d={`M${x2},${y2} L${x2 - h * Math.cos(ang - 0.45)},${y2 - h * Math.sin(ang - 0.45)} L${x2 - h * Math.cos(ang + 0.45)},${y2 - h * Math.sin(ang + 0.45)} Z`} />
    </g>
  );
}

function ToyGraph({ toy, x, y }: { toy: Toy; x: number; y: number }) {
  const inLoop = new Set((toy.loop ?? []).flat());
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={150} height={118} rx={6} className="sm-panel" />
      {toy.edges.map(([a, b]) => <Edge key={`${a}-${b}`} a={toy.nodes[a]} b={toy.nodes[b]} cls="hp-edge" />)}
      {(toy.loop ?? []).map(([a, b]) => <Edge key={`l${a}-${b}`} a={toy.nodes[a]} b={toy.nodes[b]} cls="hp-edge hp-loop" />)}
      {toy.nodes.map(([nx, ny], i) => <circle key={i} cx={nx} cy={ny} r={NODE_R} className={inLoop.has(i) ? "hp-node hp-node-loop" : "hp-node"} />)}
      <text x={75} y={136} className="sm-num sm-strongnum" textAnchor="middle">{toy.title}</text>
      <text x={75} y={151} className="sm-tiny" textAnchor="middle">{toy.values}</text>
    </g>
  );
}

/* ------------------------------------------------------------------ the cube (oblique projection) */
const P0: Pt = [548, 372];
const TU = 70, FV: Pt = [48, -40], OV = 190;
const cube = (T: number, F: number, O: number): Pt => [P0[0] + (T + 1) * TU + F * FV[0], P0[1] + F * FV[1] - O * OV];

function Cube() {
  const corners: [number, number, number][] = [];
  for (const T of [-1, 1]) for (const F of [0, 1]) for (const O of [0, 1]) corners.push([T, F, O]);
  const edges = corners.flatMap((a, i) => corners.slice(i + 1)
    .filter((b) => a.filter((v, k) => v !== b[k]).length === 1).map((b) => [a, b] as const));
  const pts: { at: [number, number, number]; label: string; dx: number; dy: number; anchor: "start" | "middle" | "end"; ours?: boolean }[] = [
    { at: [-1, 1, 1], label: "inverted", dx: 0, dy: -10, anchor: "middle" },
    { at: [0, 1, 1], label: "funnel–fan", dx: 0, dy: -10, anchor: "middle" },
    { at: [1, 1, 1], label: "pyramid", dx: 0, dy: -10, anchor: "middle" },
    { at: [1, 0.83, 0.5], label: "hub + loop", dx: -9, dy: 4, anchor: "end" },
    { at: [0, 0, 0], label: "ring", dx: 0, dy: -9, anchor: "middle" },
  ];
  const hub = cube(0.88, 0.88, 0.88), spread = cube(0.25, 0.25, 0.25);
  const [fx, fy] = cube(1, 0.5, 0);
  return (
    <g>
      <text x={P0[0] - 8} y={22} className="sm-h">The morphospace</text>
      <text x={P0[0] - 8} y={40} className="sm-small">Every network is one point (T, F, O).</text>
      {edges.map(([a, b], i) => {
        const [x1, y1] = cube(...a), [x2, y2] = cube(...b);
        const front = a[1] === 0 && b[1] === 0;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className={front ? "sm-axis" : "sm-grid"} />;
      })}
      {[-1, 0, 1].map((t) => { const [x, y] = cube(t, 0, 0); return <text key={t} x={x} y={y + 15} className="sm-tiny" textAnchor="middle">{t === -1 ? "−1" : t}</text>; })}
      <text x={cube(0, 0, 0)[0]} y={P0[1] + 30} className="sm-tiny" textAnchor="middle">treeness T</text>
      {[0, 1].map((o) => { const [x, y] = cube(-1, 0, o); return <text key={o} x={x - 7} y={y + 3} className="sm-tiny" textAnchor="end">{o}</text>; })}
      <text x={P0[0] - 18} y={cube(-1, 0, 0.5)[1]} className="sm-tiny" textAnchor="middle"
        transform={`rotate(-90 ${P0[0] - 18} ${cube(-1, 0, 0.5)[1]})`}>orderability O</text>
      <text x={fx + 8} y={fy + 4} className="sm-tiny">F</text>
      {pts.map((p) => {
        const [x, y] = cube(...p.at);
        return (
          <g key={p.label}>
            <circle cx={x} cy={y} r={4} className="hp-node" />
            <text x={x + p.dx} y={y + p.dy} className="sm-tiny" textAnchor={p.anchor}>{p.label}</text>
          </g>
        );
      })}
      <line x1={hub[0]} y1={hub[1]} x2={spread[0] + 4} y2={spread[1] - 5} className="hp-descent" />
      <circle cx={hub[0]} cy={hub[1]} r={6} className="sm-source" />
      <circle cx={spread[0]} cy={spread[1]} r={5} className="hp-end" />
      <text x={hub[0] - 10} y={hub[1] + 4} className="sm-tiny hp-ours" textAnchor="end">a weighted hub ≈ 0.88</text>
      <text x={spread[0] - 9} y={spread[1] + 4} className="sm-tiny hp-ours" textAnchor="end">commitment lost</text>
    </g>
  );
}

export default function HierarchyPrimer() {
  const rows = [
    { title: "Treeness T, from −1 to 1", sub: ["Follow every path from a top to a bottom. Many ways down and", "one way back up: T > 0. The reverse: T < 0. As many each way: T = 0."] },
    { title: "Feedforwardness F and orderability O, from 0 to 1", sub: ["F: the share of path weight that avoids loops.", "O: the share of agents outside any loop (red)."] },
  ];
  return (
    <div className="sm-figure">
      <div className="sm-scroll">
        <svg viewBox="0 0 760 446" className="sm-svg" role="img" aria-label="Hierarchy coordinates: six toy networks and where they sit in the treeness, feedforwardness, orderability cube">
          {rows.map((r, j) => (
            <g key={r.title}>
              <text x={10} y={22 + j * 216} className="sm-h">{r.title}</text>
              {r.sub.map((line, k) => <text key={k} x={10} y={40 + k * 15 + j * 216} className="sm-small">{line}</text>)}
              {TOYS[j].map((toy, i) => <ToyGraph key={toy.title} toy={toy} x={10 + i * 166} y={66 + j * 216} />)}
            </g>
          ))}
          <Cube />
        </svg>
      </div>
    </div>
  );
}
