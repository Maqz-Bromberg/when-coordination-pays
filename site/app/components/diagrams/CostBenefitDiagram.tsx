/** Diagrams of the two E8 measures on a 7-node example, computed exactly at build time.
 *  Benefit: one node's attention as a bet on the source (log score), with the information cost of that bet.
 *  Cost: the same attention read as pipes; a broadcast is routed by Kirchhoff's laws and its dissipation drawn. */

const N = 7;
const LN = Math.log(N - 1);

// ---------------------------------------------------------------- benefit
type Bet = { title: string; shares: number[]; labels: string[]; note: string };

const BETS: Bet[] = [
  { title: "Uniform: no coordination", shares: Array(N - 1).fill(1 / (N - 1)), labels: ["s", "o", "", "", "", ""],
    note: "pays ln 6 on every source" },
  { title: "Committed to the source", shares: [0.85, 0.03, 0.03, 0.03, 0.03, 0.03], labels: ["s", "o", "", "", "", ""],
    note: "right and confident" },
  { title: "Committed to a stale node", shares: [0.03, 0.85, 0.03, 0.03, 0.03, 0.03], labels: ["s", "o", "", "", "", ""],
    note: "confident and wrong: over-betting" },
];

function betNumbers(a: number[]) {
  const logloss = -Math.log(a[0]);
  const H = -a.reduce((t, x) => t + (x > 0 ? x * Math.log(x) : 0), 0);
  return { logloss, benefit: LN - logloss, info: LN - H };
}

function BetPanel({ bet, x }: { bet: Bet; x: number }) {
  const w = 220, h = 120, bw = 26, gap = 8, x0 = x + 20, base = 150;
  const { logloss, benefit, info } = betNumbers(bet.shares);
  return (
    <g>
      <text x={x + w / 2} y={22} className="cb-title" textAnchor="middle">{bet.title}</text>
      {bet.shares.map((a, k) => {
        const bh = a * h;
        const bx = x0 + k * (bw + gap);
        return (
          <g key={k}>
            <rect x={bx} y={base - bh} width={bw} height={bh} className={k === 0 ? "cb-bar-src" : k === 1 ? "cb-bar-old" : "cb-bar"} />
            <text x={bx + bw / 2} y={base + 14} className="cb-small" textAnchor="middle">{bet.labels[k]}</text>
          </g>
        );
      })}
      <line x1={x0 - 4} x2={x0 + 6 * (bw + gap)} y1={base} y2={base} className="cb-axis" />
      <text x={x + w / 2} y={base + 34} className="cb-num" textAnchor="middle">log-loss {logloss.toFixed(2)} · benefit {benefit >= 0 ? "+" : ""}{benefit.toFixed(2)}</text>
      <text x={x + w / 2} y={base + 50} className="cb-num" textAnchor="middle">information cost {info.toFixed(2)} nats</text>
      <text x={x + w / 2} y={base + 66} className="cb-small" textAnchor="middle">{bet.note}</text>
    </g>
  );
}

// ---------------------------------------------------------------- cost
function attention(kind: "uniform" | "star", hub: number): number[][] {
  // A[k][i]: weight node i puts on node k (columns sum to 1)
  const A = Array.from({ length: N }, () => Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < N; k++) {
      if (k === i) continue;
      if (kind === "uniform" || i === hub) A[k][i] = 1 / (N - 1);
      else A[k][i] = k === hub ? 0.85 : 0.15 / (N - 2);
    }
  }
  return A;
}

function solve(M: number[][], b: number[]): number[] {
  const n = b.length;
  const a = M.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = a[r][c] / a[c][c];
      for (let k = c; k <= n; k++) a[r][k] -= f * a[c][k];
    }
  }
  return a.map((r, i) => r[n] / r[i]);
}

/** Broadcast from s: +1 at s, −1/(N−1) elsewhere. Returns |current| per pair and the dissipation. */
function broadcast(A: number[][], s: number) {
  const C = A.map((row, i) => row.map((_, j) => (A[i][j] + A[j][i]) / 2));
  const tot = C.flat().reduce((t, x) => t + x, 0) / 2;
  const Cn = C.map((r) => r.map((x) => x / tot));
  const L = Cn.map((r, i) => r.map((x, j) => (i === j ? r.reduce((t, y) => t + y, 0) : -x)));
  const q = Array.from({ length: N }, (_, i) => (i === s ? 1 : -1 / (N - 1)));
  const keep = Array.from({ length: N - 1 }, (_, i) => i + 1);  // ground node 0
  const pRed = solve(keep.map((i) => keep.map((j) => L[i][j])), keep.map((i) => q[i]));
  const p = [0, ...pRed];
  let diss = 0;
  const I = Cn.map((r, i) => r.map((c, j) => {
    const cur = c * (p[i] - p[j]);
    if (i < j && c > 0) diss += (cur * cur) / c;
    return Math.abs(cur);
  }));
  return { I, Cn, diss };
}

const meanDiss = (A: number[][]) => Array.from({ length: N }, (_, s) => broadcast(A, s).diss).reduce((t, x) => t + x, 0) / N;
const UNIFORM = meanDiss(attention("uniform", 0));

type Net = { title: string; A: number[][]; s: number; hub?: number; note: string };

function NetPanel({ net, x }: { net: Net; x: number }) {
  const cx = x + 110, cy = 92, R = 58;
  const pos = Array.from({ length: N }, (_, i) => [cx + R * Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / N),
                                                   cy + R * Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / N)]);
  const { I, Cn, diss } = broadcast(net.A, net.s);
  const avg = meanDiss(net.A);
  const maxC = Math.max(...Cn.flat());
  const pairs: [number, number][] = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) pairs.push([i, j]);
  return (
    <g>
      <text x={cx} y={14} className="cb-title" textAnchor="middle">{net.title}</text>
      {pairs.map(([i, j]) => (
        <line key={`c${i}-${j}`} x1={pos[i][0]} y1={pos[i][1]} x2={pos[j][0]} y2={pos[j][1]} className="cb-pipe"
          strokeWidth={0.6 + 9 * (Cn[i][j] / maxC)} />
      ))}
      {pairs.map(([i, j]) => (
        <line key={`i${i}-${j}`} x1={pos[i][0]} y1={pos[i][1]} x2={pos[j][0]} y2={pos[j][1]} className="cb-flow"
          strokeWidth={Math.max(0, 14 * I[i][j])} />
      ))}
      {pos.map(([px, py], i) => (
        <g key={i}>
          <circle cx={px} cy={py} r={i === net.s ? 8 : 5.5}
            className={i === net.s ? "cb-src" : i === net.hub ? "cb-hub" : "cb-node"} />
          {i === net.s && <text x={px} y={py + 3.5} className="cb-in" textAnchor="middle">s</text>}
        </g>
      ))}
      <text x={cx} y={180} className="cb-num" textAnchor="middle">this broadcast: {(diss / UNIFORM).toFixed(2)} × uniform</text>
      <text x={cx} y={196} className="cb-num" textAnchor="middle">network cost (all sources): {(avg / UNIFORM).toFixed(2)}</text>
      <text x={cx} y={212} className="cb-small" textAnchor="middle">{net.note}</text>
    </g>
  );
}

const NETS: Net[] = [
  { title: "Uniform attention", A: attention("uniform", 0), s: 0, note: "many parallel paths" },
  { title: "Hub = source", A: attention("star", 0), s: 0, hub: 0, note: "news from the hub: cheap" },
  { title: "Same hub, news elsewhere", A: attention("star", 0), s: 3, hub: 0, note: "squeezed through one spoke" },
];

export default function CostBenefitDiagram() {
  return (
      <div className="plot cb-wrap">
        <svg viewBox="0 0 720 240" className="cb-svg" role="img"
          aria-label="Benefit: one node's attention as a bet on the source, in three cases">
          <text x={8} y={22} className="cb-row">BENEFIT</text>
          {BETS.map((b, i) => <BetPanel key={i} bet={b} x={40 + i * 230} />)}
        </svg>
        <svg viewBox="0 0 720 222" className="cb-svg" role="img"
          aria-label="Cost: a broadcast routed through the attention network, in three cases">
          <text x={8} y={14} className="cb-row">COST</text>
          {NETS.map((n, i) => <NetPanel key={i} net={n} x={40 + i * 230} />)}
        </svg>
      </div>
  );
}
