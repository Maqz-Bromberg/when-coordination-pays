"""E6: which ingredient keeps loops, the budget or the reward? (2 x 2 factorial, nichenet.compare)

7 x 7 lattice (36 independent loops at most). Sources: constant at a corner, Markov-switching (tau_E = 50) and random
each step. Concentration exponent p from 0.4 to 3 (for the global/flux corner p = 1/(1+gamma), so p > 1/2 is Corson's
tree regime gamma < 1). eta = 0.05, 3000 steps, 3 seeds. Records backbone loops (edges >= 0.1 of the receiving
node's strongest in-weight), mean broadcast dissipation, and hierarchy coordinates of the directed backbone.

    conda run -n nichenet python -m nichenet.experiments.e6
"""

import itertools
import json
import time
from pathlib import Path

import networkx as nx
import numpy as np
from joblib import Parallel, delayed

from nichenet import compare
from nichenet.metrics.hierarchy import hierarchy_coordinates
from nichenet.ss import schedules

OUT = Path(__file__).resolve().parents[3].parent / "data" / "site" / "e6.json"
L, STEPS, ETA = 7, 3000, 0.05
PS = (0.4, 0.5, 0.67, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0, 20.0)
SCHEDULES = ("constant", "markov", "random")
SEEDS = (0, 1, 2)
KAPPAS = (0.25, 0.5)


def one(budget, usage, schedule, p, seed, kappa=0.0):
    sub = compare.Substrate(nx.grid_2d_graph(L, L))
    rng = np.random.default_rng(seed)
    if schedule == "constant":
        src = schedules.constant(STEPS, 0)
    elif schedule == "markov":
        src = schedules.markov(STEPS, sub.n, 50.0, rng)
    else:
        src = schedules.random(STEPS, sub.n, rng)
    W = sub.run(sub.initial(budget, rng), src, compare.Cell(budget, usage, p=p, eta=ETA, kappa=kappa))
    hc = hierarchy_coordinates(sub.backbone(W).astype(float))
    return dict(budget=budget, usage=usage, schedule=schedule, p=p, seed=seed, kappa=kappa, loops=sub.loops(W),
                eff_edges=sub.effective_edges(W), spans=sub.spans(W),
                dissipation=sub.mean_dissipation(W), T=hc.treeness, F=hc.feedforwardness, O=hc.orderability)


def main(n_jobs=14):
    t0 = time.time()
    jobs = [delayed(one)(b, u, sc, p, s) for b, u, sc, p, s in
            itertools.product(compare.BUDGETS, compare.USAGES, SCHEDULES, PS, SEEDS)]
    # self-reinforcement for the RWED reward: the SS info-score exponent kappa (B5: symmetry breaks at p > 1/kappa)
    jobs += [delayed(one)(b, "rwed", sc, p, s, k) for b, sc, p, s, k in
             itertools.product(compare.BUDGETS, SCHEDULES, PS, SEEDS, KAPPAS)]
    rows = Parallel(n_jobs=n_jobs)(jobs)
    OUT.write_text(json.dumps({"lattice": L, "steps": STEPS, "eta": ETA, "ps": PS, "max_loops": (L - 1) ** 2,
                               "rows": rows}))
    print(f"{len(rows)} runs in {time.time() - t0:.0f} s -> {OUT}")
    for metric in ("loops", "spans"):
        print(f"\nmean {metric} by p = {PS}")
        variants = [(b, u, 0.0) for b, u in itertools.product(compare.BUDGETS, compare.USAGES)]
        variants += [(b, "rwed", k) for b in compare.BUDGETS for k in KAPPAS]
        for b, u, k in variants:
            for sc in SCHEDULES:
                vals = [np.mean([r[metric] for r in rows if (r["budget"], r["usage"], r["schedule"], r["p"], r["kappa"])
                                 == (b, u, sc, p, k)]) for p in PS]
                fmt = "{:6.1f}" if metric == "loops" else "{:9.2e}"
                label = f"{u}" + (f" k={k}" if u == "rwed" else "")
                print(f"  {b:6s} {label:10s} {sc:8s} " + " ".join(fmt.format(v) for v in vals))


if __name__ == "__main__":
    main()
