"""V-TR2/3 sweep: loop count of optimal transport networks against the cost exponent gamma.

Corson (2010) square lattice (8 x 8, sink in a corner) for source fluctuation sigma in {0, 1, 3}, and Katifori et al.
(2010) triangular lattice with steady versus single moving sink. Iterations run to convergence (tolerance 1e-12).

    conda run -n nichenet python -m nichenet.experiments.v_tr
"""

import json
import time
from pathlib import Path

import numpy as np
from joblib import Parallel, delayed

from nichenet.transport import network as tn

OUT = Path(__file__).resolve().parents[3].parent / "data" / "site" / "v_tr.json"
GAMMAS = (0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1.1, 1.5)
SEEDS = (0, 1, 2)


def corson(sigma, gamma, seed, n=8):
    net = tn.lattice(n)
    C, it = net.optimize(gamma, tn.corson_moments(n * n, sigma), rng=np.random.default_rng(seed))
    return dict(model="corson", sigma=sigma, gamma=gamma, seed=seed, loops=net.loops(C), iterations=it,
                max_loops=(n - 1) ** 2)


def katifori(load, gamma, seed):
    tri = tn.triangular(6, 8)
    loads = tn.steady_loads(tri.n) if load == "steady" else tn.moving_sink_loads(tri.n)
    C, it = tri.optimize(gamma, loads, rng=np.random.default_rng(seed))
    return dict(model="katifori", load=load, gamma=gamma, seed=seed, loops=tri.loops(C), iterations=it,
                max_loops=tri.n_edges - tri.n + 1)


def main(n_jobs=14):
    t0 = time.time()
    jobs = [delayed(corson)(s, g, seed) for s in (0.0, 1.0, 3.0) for g in GAMMAS for seed in SEEDS]
    jobs += [delayed(katifori)(ld, g, seed) for ld in ("steady", "moving") for g in GAMMAS for seed in SEEDS]
    rows = Parallel(n_jobs=n_jobs)(jobs)
    OUT.write_text(json.dumps({"gammas": GAMMAS, "rows": rows}))
    print(f"{len(rows)} optima in {time.time() - t0:.0f} s -> {OUT}")
    for key, sel in [(f"corson sigma={s}", dict(model="corson", sigma=s)) for s in (0.0, 1.0, 3.0)] + \
                    [(f"katifori {ld}", dict(model="katifori", load=ld)) for ld in ("steady", "moving")]:
        means = [np.mean([r["loops"] for r in rows if all(r.get(k) == v for k, v in sel.items()) and r["gamma"] == g])
                 for g in GAMMAS]
        print(f"  {key:22s} " + " ".join(f"{m:5.1f}" for m in means))


if __name__ == "__main__":
    main()
