"""E3: paying nodes for in-attention (Lee et al.'s monopoly prediction transposed to the SS model).

Clean SS on a complete graph (N = 30), tempered selection T = 0.6, eps = 1, Markov source (tau_E = 200 or 2000).
Each node i has
its own edge conservation kappa_i in [0, 0.55] (below T, so it never locks in): its info score is
D_k^(kappa_i - 1) W_ki^kappa_i. kappa_i is the node's relay reliability: higher kappa_i keeps its attention, including
its attention to the source, more stable, which raises its value as a relay for others.

Payoff over an epoch of 200 steps: a * (in-attention received as a relay: sum_j W_ij, averaged over the steps in
                                       which i is not the source)
                                 - (RWED distance of i from the current source / delta, mean over steps).
The hub is the node with the largest relay in-attention.
After each epoch the lowest-payoff node copies the trait of the highest-payoff node plus N(0, 0.05) noise (Moran
death-birth). a = 0 is the control (no payoff for attention). 150 epochs, 4 seeds.

Measured: mean kappa over epochs; hub (node with the largest in-attention) tenure; at each hub change, whether the
new hub's kappa is below the old hub's (a "destabilizing" takeover).

Variant "endogenous" (E3b): the source still switches with probability 1/tau_E per step, but the new source is drawn
in proportion to the relay in-attention each node currently receives, so attention buys future source status (the
thesis's "diversity of connections" seeding points the same way). Writes e3_endogenous.json.

    conda run -n nichenet python -m nichenet.experiments.e3 [exogenous|endogenous] [complete|sparse]
"""

import json
import sys
import time
from pathlib import Path

import numpy as np
from joblib import Parallel, delayed

from nichenet.core import graphs
from nichenet.core.linalg import col_normalize, row_normalize, rwed
from nichenet.ss import schedules

SOURCE_RULE = sys.argv[1] if len(sys.argv) > 1 else "exogenous"
GRAPH = sys.argv[2] if len(sys.argv) > 2 else "complete"  # "complete" or "sparse" (k = 4 out-edges per node)
DATA = Path(__file__).resolve().parents[3].parent / "data" / "site"
OUT = DATA / ("e3" + ("" if SOURCE_RULE == "exogenous" else "_endogenous") + ("" if GRAPH == "complete" else "_sparse")
              + ".json")
N, TEMP, EPS, DELTA, RHO = 30, 0.6, 1.0, 10.0, 2.6
TAU_ES = (200.0, 2000.0)
KMAX, EPOCH, EPOCHS, MUT = 0.55, 200, 150, 0.05
PAYS = (0.0, 0.5, 1.0, 2.0)
SEEDS = (0, 1, 2, 3)


def step(A, mask, kappa, s):
    D, _ = rwed(row_normalize(A), DELTA)
    d = D[s].copy()
    d[s] = np.delete(d, s).min() / RHO
    X = d / d.sum()
    S = np.where(mask, np.power(X[:, None], kappa[None, :] - 1.0) * np.power(A, kappa[None, :]), 0.0)
    R = col_normalize(np.where(mask, np.power(S, 1.0 / TEMP), 0.0))
    return col_normalize(A + EPS * R), d


def run(a, seed, tau_E=200.0):
    rng = np.random.default_rng(seed)
    A = graphs.uniform_random(N, rng) if GRAPH == "complete" else graphs.sparse_random(N, 4, rng)
    mask = graphs.edge_mask(A)
    kappa = rng.uniform(0.0, KMAX, N)
    src = schedules.markov(EPOCH * EPOCHS, N, tau_E, rng)
    switch = rng.random(EPOCH * EPOCHS) < 1.0 / tau_E
    current = int(src[0])
    mean_kappa, hubs, takeovers = [], [], []
    t = 0
    for _ in range(EPOCHS):
        inatt = np.zeros(N)
        counted = np.zeros(N)
        dist = np.zeros(N)
        for _ in range(EPOCH):
            if SOURCE_RULE == "exogenous":
                s = int(src[t])
            else:
                if t > 0 and switch[t]:
                    relay = A.sum(axis=1) - np.diagonal(A)
                    relay[current] = 0.0
                    current = int(rng.choice(N, p=relay / relay.sum()))
                s = current
            A, d = step(A, mask, kappa, s)
            contrib = A.sum(axis=1) - np.diagonal(A)
            contrib[s] = 0.0  # attention paid to the source is not relay attention
            inatt += contrib
            counted += 1.0
            counted[s] -= 1.0
            dist += d / DELTA
            t += 1
        inatt /= np.maximum(counted, 1.0)
        dist /= EPOCH
        hub = int(np.argmax(inatt))
        if hubs and hub != hubs[-1]:
            takeovers.append({"old": hubs[-1], "new": hub, "old_kappa": float(kappa[hubs[-1]]),
                              "new_kappa": float(kappa[hub])})
        hubs.append(hub)
        payoff = a * inatt - dist
        worst, best = int(np.argmin(payoff)), int(np.argmax(payoff))
        kappa[worst] = np.clip(kappa[best] + rng.normal(0, MUT), 0.0, KMAX)
        mean_kappa.append(float(kappa.mean()))
    tenures, cur = [], 1
    for k in range(1, len(hubs)):
        if hubs[k] == hubs[k - 1]:
            cur += 1
        else:
            tenures.append(cur)
            cur = 1
    tenures.append(cur)
    destab = [tk for tk in takeovers if tk["new_kappa"] < tk["old_kappa"]]
    return dict(a=a, seed=seed, tau_E=tau_E, mean_kappa=mean_kappa, hubs=hubs, mean_tenure=float(np.mean(tenures)),
                n_takeovers=len(takeovers), frac_destabilizing=(len(destab) / len(takeovers) if takeovers else None),
                final_kappa=kappa.tolist())


def main(n_jobs=14):
    t0 = time.time()
    rows = Parallel(n_jobs=n_jobs)(delayed(run)(a, s, te) for te in TAU_ES for a in PAYS for s in SEEDS)
    OUT.write_text(json.dumps({"source_rule": SOURCE_RULE, "graph": GRAPH, "n": N, "temperature": TEMP,
                               "tau_Es": TAU_ES, "epoch": EPOCH, "epochs": EPOCHS,
                               "kappa_max": KMAX, "rows": rows}))
    print(f"{len(rows)} runs in {time.time() - t0:.0f} s -> {OUT}")
    for te, a in [(te, a) for te in TAU_ES for a in PAYS]:
        sel = [r for r in rows if r["a"] == a and r["tau_E"] == te]
        start = np.mean([r["mean_kappa"][0] for r in sel])
        end = np.mean([np.mean(r["mean_kappa"][-20:]) for r in sel])
        ten = np.mean([r["mean_tenure"] for r in sel])
        tko = np.mean([r["n_takeovers"] for r in sel])
        fr = [r["frac_destabilizing"] for r in sel if r["frac_destabilizing"] is not None]
        print(f"tau_E={te:5.0f} a={a:.1f}: mean kappa {start:.3f} -> {end:.3f}; hub tenure {ten:.1f} epochs; "
              f"takeovers {tko:.1f}; "
              f"destabilizing share {np.mean(fr) if fr else float('nan'):.2f}")


if __name__ == "__main__":
    main()
