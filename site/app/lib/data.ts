/** Data preparation for the chapter charts (build time). Every number on the site comes from data/site/*.json. */
import a4 from "@data/a4_test.json";
import an from "@data/analysis.json";
import e1 from "@data/e1.json";
import e1k from "@data/e1_kappa.json";
import e2 from "@data/e2.json";
import e4 from "@data/e4.json";
import e5 from "@data/e5.json";
import e7 from "@data/e7.json";
import e7r from "@data/e7_rewards.json";
import e8 from "@data/e8.json";
import e9 from "@data/e9.json";

export const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
export const f2 = (x: number | null | undefined, d = 2) => (x === null || x === undefined || Number.isNaN(x) ? "–" : x.toFixed(d));

export const REGIME_COLORS = { distributed: "#7FA8C9", hierarchy: "#2B7351", "over-betting": "#B5462E" };

/* ---------------------------------------------------------------- E8 */
type R8 = { n: number; nu: number; T: number; seed: number; tracking: number; log_loss: number; benefit: number; cost: number;
            ed_cost: number; commitment: number; path: number[][] };
export const E8 = { rows: e8.rows as R8[], ns: e8.ns as number[], nus: e8.nus as number[], temps: e8.temps as number[],
                    kappa: e8.kappa as number, tauE: e8.tau_E as number, tHalf: (n: number) => (e8.T_half as Record<string, number>)[String(n)] };
export function e8cell(n: number, nu: number, T: number) {
  const sel = E8.rows.filter((r) => r.n === n && r.nu === nu && r.T === T);
  return { tracking: mean(sel.map((r) => r.tracking)), benefit: mean(sel.map((r) => r.benefit)), cost: mean(sel.map((r) => r.cost)),
           edCost: mean(sel.map((r) => r.ed_cost)), F: mean(sel.map((r) => r.path[r.path.length - 1][1])) };
}
export function e8best(n: number, nu: number) {
  return E8.temps.map((T) => ({ T, ...e8cell(n, nu, T) })).reduce((a, b) => (b.benefit > a.benefit ? b : a));
}
export const e8bests = () => E8.ns.flatMap((n) => E8.nus.map((nu) => ({ n, nu, ...e8best(n, nu) })));
export const e8byN = (key: "frac" | "cost" | "perCost") => e8bests().map((b) => ({ N: b.n, nu: `ν = ${b.nu}`,
  y: +(key === "frac" ? b.benefit / Math.log(b.n - 1) : key === "cost" ? b.cost : b.benefit / b.cost).toFixed(3) }));
export const e8frontier = (n: number) => E8.nus.flatMap((nu) => E8.temps.filter((T) => T > E8.kappa).map((T) => {
  const c = e8cell(n, nu, T);
  return { cost: +c.cost.toFixed(3), frac: +(c.benefit / Math.log(n - 1)).toFixed(3), nu: `ν = ${nu}`, T };
}));
export const e8overT = (n: number, k: "tracking" | "F") => E8.nus.flatMap((nu) => E8.temps.map((T) => ({ T, y: +e8cell(n, nu, T)[k].toFixed(3), nu: `ν = ${nu}` })));

/* ---------------------------------------------------------------- analysis */
export type THalfRow = { n: number; nu: number; closed: number; averaged: number | null; relay: number | null; sim: number | null };
export const AN = {
  tHalf: an.t_half.rows as THalfRow[],
  spectra: an.spectra as { n: number; kappa: number; rows: { T: number; x_star: number; radius: number; bulk: number; n_bulk: number; n_modes: number }[] },
  separatrix: an.separatrix as { n: number; steps: number; rows: { kappa: number; T: number; selection: string; ratio: number; agreement: number; predicted_locked: number; observed_locked: number }[] },
  meanField: an.mean_field.rows as { n: number; nu: number; T: number; sim: number; averaged: number | null; walk: number; relay: number }[],
};
export const windowRows = () => AN.tHalf.filter((r) => r.sim !== null).map((r) => ({ nu: r.nu, w: +((r.sim! - E8.kappa) / (r.closed - E8.kappa)).toFixed(3), src: `N = ${r.n}` }));

/* ---------------------------------------------------------------- A4 test */
export type RA4 = Record<string, number>;
export const A4 = { rows: a4.rows as RA4[], temps: a4.temps as number[] };
export const A4_SERIES: [string, string][] = [["rwed", "position, free"], ["rwed_sym", "position, rivals equal"], ["relay_walk", "relay walk"],
  ["column_rwed", "column walk (position)"], ["likelihood", "evidence, free"], ["likelihood_sym", "evidence, rivals equal"], ["sym_walk", "symmetric walk"]];
export const A4_COLORS: Record<string, string> = { "position, free": "#A3621A", "position, rivals equal": "#E0A35C", "relay walk": "#C9B08A",
  "column walk (position)": "#B5462E", "evidence, free": "#2B7351", "evidence, rivals equal": "#6CC497", "symmetric walk": "#9AA9A1" };
export const a4Series = (n: number, nu: number) => A4_SERIES.flatMap(([k, name]) =>
  A4.rows.filter((r) => r.n === n && r.nu === nu).map((r) => ({ T: r.T, y: +r[k].toFixed(3), cond: name })));

/* ---------------------------------------------------------------- E9 */
type R9 = { rule: string; n: number; nu: number; T: number | null; tracking: number; benefit: number; cost: number; info_cost: number };
const r9 = e9.rows as R9[];
export const RULE_NAMES: Record<string, string> = { rwed: "reward position", "lik-rho": "reward evidence",
  "lik-bayes": "evidence, noise-tuned", bayes: "ideal statistician" };
export const RULE_COLORS: Record<string, string> = { "reward position": "#A3621A", "reward evidence": "#2B7351",
  "evidence, noise-tuned": "#7FA8C9", "ideal statistician": "#5A6660" };
export const m9 = (rule: string, n: number, nu: number, T: number | null, k: keyof R9) =>
  mean(r9.filter((r) => r.rule === rule && r.n === n && r.nu === nu && (rule === "bayes" || r.T === T)).map((r) => r[k] as number));
export const best9 = (rule: string, n: number, nu: number) => rule === "bayes" ? null
  : E8.temps.reduce((a, T) => (m9(rule, n, nu, T, "benefit") > m9(rule, n, nu, a, "benefit") ? T : a), E8.temps[0]);
export const e9byNu = (n: number) => Object.keys(RULE_NAMES).flatMap((rule) => E8.nus.map((nu) => ({
  nu, y: +(m9(rule, n, nu, best9(rule, n, nu), "benefit") / Math.log(n - 1)).toFixed(3), rule: RULE_NAMES[rule] })));
export const e9overT = (n: number, nu: number, f: (rule: string, T: number) => number) =>
  Object.keys(RULE_NAMES).flatMap((rule) => E8.temps.filter((T) => T > E8.kappa).map((T) => ({ T, y: +f(rule, T).toFixed(3), rule: RULE_NAMES[rule] })));

/* ---------------------------------------------------------------- E5, E2 */
type R5 = { persistence: string; kappa: number; T: number; regime: string; tracking: number; commitment: number };
export const E5 = { n: e5.n as number, steps: e5.steps as number, kappas: e5.kappas as number[], persistence: e5.persistence as string[],
                    theory: (k: number) => Object.entries(e5.theory as Record<string, { T_c: number; T_half: number }>).find(([key]) => Number(key) === k)![1] };
export function e5regimes(persistence: string) {
  const rows = (e5.rows as R5[]).filter((r) => r.persistence === persistence);
  const keys = Array.from(new Set(rows.map((r) => `${r.T}|${r.kappa}`)));
  return keys.map((key) => {
    const [T, kappa] = key.split("|").map(Number);
    const sel = rows.filter((r) => r.T === T && r.kappa === kappa);
    const counts = new Map<string, number>();
    sel.forEach((r) => counts.set(r.regime, (counts.get(r.regime) ?? 0) + 1));
    const regime = Array.from(counts).sort((a, b) => b[1] - a[1])[0][0];
    return { T, kappa, regime, tracking: +mean(sel.map((r) => r.tracking)).toFixed(3), commitment: +mean(sel.map((r) => r.commitment)).toFixed(3) };
  });
}
export const e5lines = () => ({
  tc: E5.kappas.filter((k) => k > 0).map((k) => ({ T: E5.theory(k).T_c, kappa: k })),
  th: E5.kappas.map((k) => ({ T: E5.theory(k).T_half, kappa: k })),
});
export const e2collapse = () => (e2.rows as { n: number; kappa: number; seed: number; z: number; attention: number }[])
  .filter((r) => r.kappa === 0 && r.seed === 0).map((r) => ({ z: r.z, attention: r.attention, N: `N = ${r.n}` }));

/* ---------------------------------------------------------------- E1, E4, E7 */
export const e1rows = () => [
  ...(e1.rows as { tau_E: number; tau_m_star: number }[]).map((r) => ({ tau_E: r.tau_E, tau_m_star: r.tau_m_star, knob: "memory via ε" })),
  ...(e1k.rows as { tau_E: number; tau_m_star: number }[]).map((r) => ({ tau_E: r.tau_E, tau_m_star: r.tau_m_star, knob: "memory via κ" })),
];
export const E1 = { slopeEps: e1.slope_tau_m as number, slopeKappa: e1k.slope_tau_m as number };
type Case4 = { type: string; tau_E: number; BR: number[]; fixed_point: number; BR_slope: number; self_optimum: number; tau_eff_at_fixed: number };
export const E4 = { tm: e4.tau_m as number[], cases: e4.cases as Case4[] };
export const e4br = (tauE: number) => [
  ...E4.cases.filter((c) => c.tau_E === tauE).flatMap((c) => E4.tm.map((tm, i) => ({ tm, br: c.BR[i], type: c.type }))),
  ...E4.tm.map((tm) => ({ tm, br: tm, type: "identity" })),
];
export const e7curves = (tauE: number) => ([[e7, "sum distances (thesis)"], [e7r, "average rewards"]] as const).flatMap(([d, rule]) => {
  const s = (d.summary as { tau_E: number; curve: number[] }[]).find((r) => r.tau_E === tauE)!;
  return (d.windows as number[]).map((k, i) => ({ k, loss: s.curve[i], rule }));
});

/* ---------------------------------------------------------------- E6, E3, paths */
import e3 from "@data/e3.json";
import e6 from "@data/e6.json";
import e6pics from "@data/e6_illustration.json";
import paths from "@data/paths.json";

type R6 = { budget: string; usage: string; kappa: number; schedule: string; p: number; loops: number; spans: boolean };
export const E6_COLORS: Record<string, string> = {
  "global budget, flow": "#5B2A86", "per-agent budget, flow": "#B07CC6", "per-agent budget, closeness κ = 0": "#8C8C8C",
  "per-agent budget, closeness κ = 0.25": "#E0A35C", "per-agent budget, closeness κ = 0.5": "#A3621A",
};
export const E6 = { ps: e6.ps as number[], lattice: e6.lattice as number, pics: e6pics };
export function e6loops(schedule: string) {
  const rows = e6.rows as R6[];
  const cells: [string, string, number, string][] = [
    ["node", "flux", 0, "per-agent budget, flow"], ["global", "flux", 0, "global budget, flow"],
    ["node", "rwed", 0, "per-agent budget, closeness κ = 0"], ["node", "rwed", 0.25, "per-agent budget, closeness κ = 0.25"],
    ["node", "rwed", 0.5, "per-agent budget, closeness κ = 0.5"],
  ];
  return cells.flatMap(([b, u, k, label]) => E6.ps.flatMap((p) => {
    const sel = rows.filter((r) => r.budget === b && r.usage === u && r.kappa === k && r.schedule === schedule && r.p === p);
    if (b === "global" && sel.filter((r) => !r.spans).length > sel.length / 2) return [];
    return [{ p, loops: sel.reduce((a, r) => a + r.loops, 0) / sel.length, cell: label }];
  }));
}
type R3 = { a: number; tau_E: number; mean_tenure: number; n_takeovers: number; frac_destabilizing: number };
export const e3table = () => (e3.tau_Es as number[]).flatMap((tau) => Array.from(new Set((e3.rows as R3[]).map((r) => r.a))).sort((x, y) => x - y)
  .map((a) => { const s = (e3.rows as R3[]).filter((r) => r.a === a && r.tau_E === tau);
    return { tau, a, tenure: mean(s.map((r) => r.mean_tenure)), takeovers: mean(s.map((r) => r.n_takeovers)) }; }));
export const PATH_GROUPS = paths.groups;

/* ---------------------------------------------------------------- E5 final networks (hover previews) */
import e5s from "@data/e5_structures.json";
export type E5Structure = { kappa: number; T: number; source: number; links: number[][] };
export const E5S = { n: e5s.n as number, minW: e5s.min_w as number };
export const e5structures = (persistence: string): E5Structure[] =>
  (e5s.cells as (E5Structure & { persistence: string })[]).filter((c) => c.persistence === persistence)
    .map(({ kappa, T, source, links }) => ({ kappa, T, source, links }));
