/** A worked round of the model on six agents, computed with the model's own equations (clean mode, tempered
 *  selection) at build time. Used by the step-by-step carousel in chapter 1 and the matching figure in the paper. */

export const NAMES = ["A", "B", "C", "D", "E", "F"];
export const PARAMS = { kappa: 0.2, T: 0.3, eps: 1, rho: 2.6, delta: 10 };
export const SOURCE = 0; // A
export const FOCUS = 4; // E: the listener whose update is followed in detail

type M = number[][];
const n = NAMES.length;

/** Starting attention: A[k][i] is how much i listens to k (columns sum to 1, no self-attention). */
function start(): M {
  let s = 20260601;
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  const A = Array.from({ length: n }, (_, k) => Array.from({ length: n }, (_, i) => (k === i ? 0 : 0.3 + rnd())));
  for (let i = 0; i < n; i++) { const t = A.reduce((a, r) => a + r[i], 0); for (let k = 0; k < n; k++) A[k][i] /= t; }
  return A;
}

function inverse(X: M): M {
  const m = X.length;
  const a = X.map((r, i) => [...r, ...Array.from({ length: m }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < m; c++) {
    let p = c;
    for (let r = c + 1; r < m; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    [a[c], a[p]] = [a[p], a[c]];
    const d = a[c][c];
    for (let j = 0; j < 2 * m; j++) a[c][j] /= d;
    for (let r = 0; r < m; r++) if (r !== c) { const f = a[r][c]; for (let j = 0; j < 2 * m; j++) a[r][j] -= f * a[c][j]; }
  }
  return a.map((r) => r.slice(m));
}

/** One round from seed s: shares P, effective distances D (with the source substitution), scores, rewards, update. */
export function round(A: M, s: number, p = PARAMS) {
  const P = A.map((row) => { const t = row.reduce((a, x) => a + x, 0); return row.map((x) => x / t); });
  const Z = inverse(P.map((row, k) => row.map((x, j) => (k === j ? 1 : 0) - Math.exp(-p.delta) * x)));
  const D = Array.from({ length: n }, (_, k) => (k === s ? 0 : -Math.log(Z[s][k] / Z[k][k])));
  const minRelay = Math.min(...D.filter((_, k) => k !== s));
  D[s] = minRelay / p.rho;
  const Dsum = D.reduce((a, x) => a + x, 0);
  const S = A.map((row, k) => row.map((a, i) => (k === i ? 0 : Math.pow(D[k] / Dsum, p.kappa - 1) * Math.pow(a, p.kappa))));
  const R = S.map((row) => row.map(() => 0));
  for (let i = 0; i < n; i++) {
    const t = S.reduce((acc, row, k) => acc + (k === i ? 0 : Math.pow(row[i], 1 / p.T)), 0);
    for (let k = 0; k < n; k++) R[k][i] = k === i ? 0 : Math.pow(S[k][i], 1 / p.T) / t;
  }
  const next = A.map((row, k) => row.map((a, i) => (a + p.eps * R[k][i]) / (1 + p.eps)));
  return { P, D, minRelay, S, R, next };
}

export function example() {
  const A0 = start();
  const r = round(A0, SOURCE);
  // many rounds with the same source: where the update leads
  let A = A0;
  const tracking: number[] = [];
  for (let t = 0; t < 30; t++) {
    A = round(A, SOURCE).next;
    tracking.push(A[SOURCE].reduce((a, x) => a + x, 0) / (n - 1));
  }
  return { A0, ...r, after30: A, tracking };
}
