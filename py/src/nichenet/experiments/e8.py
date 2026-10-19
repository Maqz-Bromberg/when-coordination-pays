"""E8: the cost of coordination against niche size and signal noise, with paths in the hierarchy morphospace.

Clean SS, complete graphs N in {10, 20, 40, 80} (niche size: the number of nodes and of possible sources), tempered
selection over T, kappa = 0.2, eps = 1, Markov true source (tau_E = 300) observed through noisy seeding with noise
nu in {0, 0.25, 0.5, 0.75} (the seed is the true source with probability 1 - nu, otherwise a random node). 3000 steps
in 10 segments of 300 (snapshots), 2 seeds, GPU.

Per run:
  benefit   ln(N - 1) - log-loss on the true source (second half): the Kelly gain of coordinated attention over
            uniform attention, in nats
  cost      broadcast dissipation averaged over all sources (conductance (W + W^T)/2, total conductance 1) relative
            to the uniform network: the transport price of the lateral connections given up (as in E6)
  ed_cost   increase of the mean all-to-all random-walk effective distance over the uniform network (the thesis's
            global measure; blind to uniform attention on one node, see E1)
  tracking, commitment as in E5; corrected hierarchy coordinates (T, F, O) of every snapshot (time paths).

    XLA_PYTHON_CLIENT_PREALLOCATE=false conda run -n nichenet python -m nichenet.experiments.e8
"""

import json
import time
from pathlib import Path

import networkx as nx
import numpy as np
from hierarchy_coordinates import hierarchy_coordinates
from joblib import Parallel, delayed

from nichenet import compare
from nichenet.continuum import large_delta as ld
from nichenet.core import graphs
from nichenet.core.linalg import row_normalize, rwed
from nichenet.ss import jax_kernel, schedules

OUT = Path(__file__).resolve().parents[3].parent / "data" / "site" / "e8.json"
NS = (10, 20, 40, 80)
NUS = (0.0, 0.25, 0.5, 0.75)
TEMPS = (0.15, 0.25, 0.3, 0.35, 0.45, 0.6, 0.8)
KAPPA, TAU_E, SEG, NSEG, SEEDS, DELTA = 0.2, 300.0, 300, 10, (0, 1), 10.0


def mean_ed(A):
    D, _ = rwed(row_normalize(A), DELTA)
    off = ~np.eye(A.shape[0], dtype=bool)
    return float(D[off].mean())


def dissipation(A):
    sub = compare.Substrate(nx.complete_graph(A.shape[0]))
    return sub.mean_dissipation(A)


def hc_tuple(A):
    h = hierarchy_coordinates(A)
    return (h.treeness, h.feedforwardness, h.orderability)


def main(n_jobs=14):
    t0 = time.time()
    rows = []
    for n in NS:
        meta, A0s, masks, tru, obs = [], [], [], [], []
        for nu in NUS:
            for T in TEMPS:
                for s in SEEDS:
                    rng = np.random.default_rng(1000 * s + 17 * n)
                    A0 = graphs.uniform_random(n, rng)
                    t = schedules.markov(SEG * NSEG, n, TAU_E, rng)
                    A0s.append(A0)
                    masks.append(graphs.edge_mask(A0))
                    tru.append(t)
                    obs.append(schedules.noisy(t, n, nu, rng))
                    meta.append((nu, T, s))
        B = len(meta)
        A = np.stack(A0s)
        mask, tru, obs = np.stack(masks), np.stack(tru), np.stack(obs)
        par = (np.full(B, KAPPA), np.zeros(B), np.ones(B), np.array([m[1] for m in meta]))
        snaps, ll, att = [A.copy()], [], []
        for k in range(NSEG):
            sl = slice(k * SEG, (k + 1) * SEG)
            A, o = jax_kernel.run_batch(A, mask, obs[:, sl], *par, true_sources=tru[:, sl], tempered=True,
                                        record_every=SEG)
            A = np.asarray(A)
            snaps.append(A.copy())
            ll.append(np.asarray(o["true_logloss_block"])[:, 0])
            att.append(np.asarray(o["true_attention_block"])[:, 0])
        ll, att = np.array(ll).T, np.array(att).T
        uniform_ed = mean_ed(np.where(mask[0], 1.0, 0.0) / (n - 1))
        snaps = np.stack(snaps, axis=1)  # (B, NSEG + 1, n, n)
        flat = [snaps[b, k] for b in range(B) for k in range(NSEG + 1)]
        hcs = Parallel(n_jobs=n_jobs)(delayed(hc_tuple)(a) for a in flat)
        eds = Parallel(n_jobs=n_jobs)(delayed(mean_ed)(snaps[b, -1]) for b in range(B))
        diss = Parallel(n_jobs=n_jobs)(delayed(dissipation)(snaps[b, -1]) for b in range(B))
        uniform_diss = dissipation(np.where(mask[0], 1.0, 0.0) / (n - 1))
        off = ~np.eye(n, dtype=bool)
        for b, (nu, T, s) in enumerate(meta):
            half = NSEG // 2
            path = hcs[b * (NSEG + 1):(b + 1) * (NSEG + 1)]
            log_loss = float(ll[b, half:].mean())
            rows.append(dict(n=n, nu=nu, T=T, seed=s, tracking=float(att[b, half:].mean()), log_loss=log_loss,
                             benefit=float(np.log(n - 1) - log_loss), cost=float(diss[b] / uniform_diss),
                             ed_cost=float(eds[b] - uniform_ed),
                             commitment=float(np.max(np.where(off, snaps[b, -1], 0.0), axis=0).mean()),
                             path=[list(p) for p in path]))
        print(f"N={n:3d}: {B} runs ({time.time() - t0:.0f} s)", flush=True)
    theory = {str(n): float(ld.T_half(n, KAPPA)) for n in NS}
    OUT.write_text(json.dumps({"ns": NS, "nus": NUS, "temps": TEMPS, "kappa": KAPPA, "tau_E": TAU_E, "segment": SEG,
                               "segments": NSEG, "T_half": theory, "rows": rows}))
    print(f"-> {OUT}")
    print("\nbest T by benefit; benefit (nats), cost (dissipation / uniform), tracking, final (T, F, O)")
    for n in NS:
        for nu in NUS:
            cells = []
            for T in TEMPS:
                sel = [r for r in rows if (r["n"], r["nu"], r["T"]) == (n, nu, T)]
                cells.append((T, np.mean([r["benefit"] for r in sel]), np.mean([r["cost"] for r in sel]),
                              np.mean([r["tracking"] for r in sel]), np.mean([r["path"][-1] for r in sel], axis=0)))
            T, bft, cst, trk, tfo = max(cells, key=lambda c: c[1])
            print(f"  N={n:3d} nu={nu:.2f}: T*={T:.2f} (T_half={theory[str(n)]:.2f})  "
                  f"benefit {bft:5.2f}  cost {cst:5.2f}  "
                  f"tracking {trk:.2f}  TFO ({tfo[0]:.2f}, {tfo[1]:.2f}, {tfo[2]:.2f})")


if __name__ == "__main__":
    main()
