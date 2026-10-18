"""E5: computed phase diagram of the SS model (replaces the schematic regime figure in note §5).

Clean mode, complete graph N = 30, tempered selection (temperature T), eps = 1, kappa in {0, 0.2, 0.4, 0.6}, source
persistence from constant through Markov tau_E = 1000, 100, 10 to random each step. 3000 steps, 3 seeds, GPU kernel.

Order parameters (time averages over the last half, except where noted):
  tracking    mean attention of the other nodes on the current source
  commitment  mean over nodes of the largest in-weight (final network): how concentrated attention is
  log_loss    mean -ln A[s, i] on the current source
  T, F, O     corrected hierarchy coordinates of the final network
Regimes: distributed (commitment < 0.5), hierarchy (commitment >= 0.5 and tracking >= 0.5 commitment),
over-betting (commitment >= 0.5 and tracking < 0.5 commitment): attention is concentrated, but on the wrong node.

Analytic boundaries for a constant source (B5, symmetric state): instability at T = kappa, half attention at
T_half = kappa + (1 - kappa) ln rho / ln(N - 2).

    XLA_PYTHON_CLIENT_PREALLOCATE=false conda run -n nichenet python -m nichenet.experiments.e5
"""

import json
import time
from pathlib import Path

import numpy as np
from joblib import Parallel, delayed

from nichenet.continuum import large_delta as ld
from nichenet.core import graphs
from nichenet.metrics.hierarchy import hierarchy_coordinates
from nichenet.ss import jax_kernel, schedules

OUT = Path(__file__).resolve().parents[3].parent / "data" / "site" / "e5.json"
N, STEPS, RECORD = 30, 3000, 10
TEMPS = tuple(np.round(np.logspace(np.log10(0.05), np.log10(2.0), 14), 4))
KAPPAS = (0.0, 0.2, 0.4, 0.6)
PERSISTENCE = (("constant", None), ("markov 1000", 1000.0), ("markov 100", 100.0), ("markov 10", 10.0),
               ("random", 1.0))
SEEDS = (0, 1, 2)


def schedule(kind, tau, rng):
    if kind == "constant":
        return schedules.constant(STEPS, 0)
    if kind == "random":
        return schedules.random(STEPS, N, rng)
    return schedules.markov(STEPS, N, tau, rng)


def main():
    t0 = time.time()
    meta, A0s, masks, srcs, kap, temp = [], [], [], [], [], []
    for (kind, tau) in PERSISTENCE:
        for k in KAPPAS:
            for T in TEMPS:
                for s in SEEDS:
                    rng = np.random.default_rng(100 * s + 1)
                    A0 = graphs.uniform_random(N, rng)
                    A0s.append(A0)
                    masks.append(graphs.edge_mask(A0))
                    srcs.append(schedule(kind, tau, rng))
                    kap.append(k)
                    temp.append(T)
                    meta.append((kind, k, float(T), s))
    B = len(meta)
    A, obs = jax_kernel.run_batch(np.stack(A0s), np.stack(masks), np.stack(srcs), np.array(kap), np.zeros(B),
                                  np.ones(B), np.array(temp), tempered=True, record_every=RECORD)
    A = np.asarray(A)
    half = STEPS // RECORD // 2
    tracking = np.asarray(obs["true_attention_block"])[:, half:].mean(axis=1)
    logloss = np.asarray(obs["true_logloss_block"])[:, half:].mean(axis=1)
    off = ~np.eye(N, dtype=bool)
    commitment = np.array([np.max(np.where(off, a, 0.0), axis=0).mean() for a in A])
    print(f"simulated {B} runs in {time.time() - t0:.0f} s; hierarchy coordinates ...", flush=True)
    hcs = Parallel(n_jobs=14)(delayed(hierarchy_coordinates)(a) for a in A)
    rows = []
    for i, (kind, k, T, s) in enumerate(meta):
        c, tr = float(commitment[i]), float(tracking[i])
        regime = "distributed" if c < 0.5 else ("hierarchy" if tr >= 0.5 * c else "over-betting")
        rows.append(dict(persistence=kind, kappa=k, T=T, seed=s, tracking=tr, commitment=c,
                         log_loss=float(logloss[i]), regime=regime, Tc=hcs[i].treeness, Fc=hcs[i].feedforwardness,
                         Oc=hcs[i].orderability))
    theory = {str(k): {"T_c": k, "T_half": float(ld.T_half(N, k))} for k in KAPPAS}
    OUT.write_text(json.dumps({"n": N, "steps": STEPS, "temps": TEMPS, "kappas": KAPPAS,
                               "persistence": [p for p, _ in PERSISTENCE], "theory": theory, "rows": rows}))
    print(f"done in {time.time() - t0:.0f} s -> {OUT}")
    for kind, _ in PERSISTENCE:
        print(f"\n{kind}: regime by kappa (rows) and T (cols {TEMPS[0]}..{TEMPS[-1]}); "
              "D distributed, H hierarchy, O over-betting")
        for k in KAPPAS:
            line = ""
            for T in TEMPS:
                regs = [r["regime"] for r in rows if (r["persistence"], r["kappa"], r["T"]) == (kind, k, float(T))]
                top = max(set(regs), key=regs.count)
                line += {"distributed": "D", "hierarchy": "H", "over-betting": "O"}[top]
            th = theory[str(k)]
            print(f"  kappa={k:.1f} {line}   (T_c={th['T_c']:.2f}, T_half={th['T_half']:.2f})")


if __name__ == "__main__":
    main()
