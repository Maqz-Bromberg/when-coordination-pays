"""E9: a KL (likelihood) reward against the thesis's RWED reward, on the E8 grid, with the Bayes filter as a bound.

Same setup as E8 (complete graphs N in {10, 20, 40, 80}, noisy seeding nu, Markov source tau_E = 300, kappa = 0.2,
eps = 1, tempered T, 3000 steps, 2 seeds). Three reward rules, all with the edge weight as explicit factor A^kappa:
  rwed        D_k^(kappa - 1) A_ki^kappa, D the random-walk effective distance from the seed (thesis)
  lik-rho     lambda_k^(1 - kappa) A_ki^kappa with lambda = rho on the seed and 1 elsewhere: the reward is the
              likelihood of the observation under "k is the source", a Kelly / multiplicative-weights rule; it equals
              the RWED reward in the symmetric state but has no relays (A4)
  lik-bayes   the same with the calibrated likelihood ratio lambda* = 1 + N (1 - nu) / nu of the noise model
and the exact Bayes filter (forward algorithm over the source, knowing nu and tau_E): the lowest log-loss any rule can
reach from the same seeds. Every node's attention is then the posterior over the other nodes.

Per run: tracking, benefit (ln(N - 1) - log-loss), dissipation cost (as E8), information cost (mean over nodes of
KL(attention column || uniform), in nats, time-averaged over the second half) and the final (T, F, O).

    XLA_PYTHON_CLIENT_PREALLOCATE=false conda run -n nichenet python -m nichenet.experiments.e9
"""

import json
import time
from pathlib import Path

import networkx as nx
import numpy as np
from joblib import Parallel, delayed

from nichenet import compare
from nichenet.core import graphs
from nichenet.metrics.hierarchy import hierarchy_coordinates
from nichenet.ss import jax_kernel, schedules

OUT = Path(__file__).resolve().parents[3].parent / "data" / "site" / "e9.json"
NS = (10, 20, 40, 80)
NUS = (0.0, 0.25, 0.5, 0.75)
TEMPS = (0.15, 0.25, 0.3, 0.35, 0.45, 0.6, 0.8)
RULES = ("rwed", "lik-rho", "lik-bayes")
KAPPA, TAU_E, STEPS, BLOCK, SEEDS, RHO = 0.2, 300.0, 3000, 300, (0, 1), 2.6


def lam_bayes(n, nu):
    return 1e8 if nu == 0 else 1 + n * (1 - nu) / nu


def final_metrics(A):
    n = A.shape[0]
    h = hierarchy_coordinates(A)
    diss = compare.Substrate(nx.complete_graph(n)).mean_dissipation(A)
    return diss, (h.treeness, h.feedforwardness, h.orderability)


def bayes_filter(true, obs, n, nu):
    """Forward filter over the source. Log-loss and tracking use each node's posterior over the other nodes;
    log-loss is scored on the prediction before the current seed, as in the kernel."""
    h = 1.0 / TAU_E
    post = np.full(n, 1.0 / n)
    ll, trk, info = [], [], []
    others = ~np.eye(n, dtype=bool)
    for t, o in zip(true, obs, strict=True):
        prior = (1 - h) * post + h * (1 - post) / (n - 1)
        col = np.where(others, prior[:, None], 0.0)
        col /= col.sum(axis=0, keepdims=True)  # column i: attention of node i over k != i
        sel = np.arange(n) != t
        ll.append(-np.log(np.maximum(col[t, sel], 1e-300)).mean())
        plogp = np.where(col > 0, col * np.log(np.where(col > 0, col, 1.0)), 0.0)
        info.append(np.log(n - 1) + plogp.sum() / n)
        lik = np.full(n, nu / n)
        lik[o] += 1 - nu
        post = prior * lik
        post = np.maximum(post / post.sum(), 1e-12)  # no exact zeros: keeps every link a finite resistor
        post /= post.sum()
        col = np.where(others, post[:, None], 0.0)
        col /= col.sum(axis=0, keepdims=True)
        trk.append(col[t, sel].mean())
    half = len(true) // 2
    return float(np.mean(ll[half:])), float(np.mean(trk[half:])), float(np.mean(info[half:])), col


def main(n_jobs=14):
    t0 = time.time()
    rows = []
    for n in NS:
        meta, A0s, tru, obs = [], [], [], []
        for nu in NUS:
            for T in TEMPS:
                for s in SEEDS:
                    rng = np.random.default_rng(1000 * s + 17 * n)  # same seeds and schedules as E8
                    A0 = graphs.uniform_random(n, rng)
                    t = schedules.markov(STEPS, n, TAU_E, rng)
                    A0s.append(A0)
                    tru.append(t)
                    obs.append(schedules.noisy(t, n, nu, rng))
                    meta.append((nu, T, s))
        B = len(meta)
        A0 = np.stack(A0s)
        mask = np.stack([graphs.edge_mask(a) for a in A0])
        tru, obs = np.stack(tru), np.stack(obs)
        par = (np.full(B, KAPPA), np.zeros(B), np.ones(B), np.array([m[1] for m in meta]))
        finals = {}
        for rule in RULES:
            lam = (np.full(B, RHO) if rule != "lik-bayes" else np.array([lam_bayes(n, m[0]) for m in meta]))
            A, o = jax_kernel.run_batch(A0, mask, obs, *par, true_sources=tru, tempered=True, record_every=BLOCK,
                                        reward="rwed" if rule == "rwed" else "likelihood", lam=lam)
            A = np.asarray(A)
            half = STEPS // BLOCK // 2
            ll = np.asarray(o["true_logloss_block"])[:, half:].mean(axis=1)
            trk = np.asarray(o["true_attention_block"])[:, half:].mean(axis=1)
            info = np.asarray(o["info_cost_block"])[:, half:].mean(axis=1)
            finals[rule] = (A, ll, trk, info)
        jobs = [(rule, b) for rule in RULES for b in range(B)]
        res = Parallel(n_jobs=n_jobs)(delayed(final_metrics)(finals[rule][0][b]) for rule, b in jobs)
        uniform = compare.Substrate(nx.complete_graph(n)).mean_dissipation(np.where(mask[0], 1.0, 0.0) / (n - 1))
        for (rule, b), (diss, tfo) in zip(jobs, res, strict=True):
            nu, T, s = meta[b]
            _, ll, trk, info = finals[rule]
            rows.append(dict(rule=rule, n=n, nu=nu, T=T, seed=s, tracking=float(trk[b]), log_loss=float(ll[b]),
                             benefit=float(np.log(n - 1) - ll[b]), cost=float(diss / uniform),
                             info_cost=float(info[b]), tfo=[float(x) for x in tfo]))
        # Bayes bound: one filter per (nu, seed); T does not enter
        for nu in NUS:
            for s in SEEDS:
                b = next(i for i, m in enumerate(meta) if m[0] == nu and m[2] == s)
                ll, trk, info, col = bayes_filter(tru[b], obs[b], n, nu)
                diss, tfo = final_metrics(col)
                rows.append(dict(rule="bayes", n=n, nu=nu, T=None, seed=s, tracking=trk, log_loss=ll,
                                 benefit=float(np.log(n - 1) - ll), cost=float(diss / uniform), info_cost=info,
                                 tfo=[float(x) for x in tfo]))
        print(f"N={n:3d}: {time.time() - t0:.0f} s", flush=True)
    OUT.write_text(json.dumps(dict(ns=NS, nus=NUS, temps=TEMPS, rules=RULES, kappa=KAPPA, tau_E=TAU_E, steps=STEPS,
                                   rows=rows)))
    print(f"-> {OUT}")
    print("\nbest T per rule: benefit/ln(N-1), dissipation cost, info cost (nats), tracking; Bayes bound")
    for n in NS:
        for nu in NUS:
            line = f"N={n:3d} nu={nu:.2f}:"
            for rule in RULES:
                cells = []
                for T in TEMPS:
                    sel = [r for r in rows if (r["rule"], r["n"], r["nu"], r["T"]) == (rule, n, nu, T)]
                    cells.append((T, *(np.mean([r[k] for r in sel]) for k in ("benefit", "cost", "info_cost",
                                                                              "tracking"))))
                T, bft, cst, inf, trk = max(cells, key=lambda c: c[1])
                line += f"  {rule} T={T:.2f} {bft / np.log(n - 1):5.2f} {cst:4.2f} {inf:4.2f} {trk:4.2f} |"
            sel = [r for r in rows if (r["rule"], r["n"], r["nu"]) == ("bayes", n, nu)]
            line += (f"  bayes {np.mean([r['benefit'] for r in sel]) / np.log(n - 1):5.2f} "
                     f"{np.mean([r['cost'] for r in sel]):4.2f} {np.mean([r['info_cost'] for r in sel]):4.2f} "
                     f"{np.mean([r['tracking'] for r in sel]):4.2f}")
            print(line)


if __name__ == "__main__":
    main()
