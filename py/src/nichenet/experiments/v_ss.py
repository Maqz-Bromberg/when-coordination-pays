"""V-SS1-4: the 2020 thesis's qualitative results on a reduced (phi, kappa) grid.

Faithful mode (thesis code behaviour), N = 60, 300 steps, constant (node 1) and random seeding, complete graphs and
sparse graphs with k = 6 out-edges (thesis density 0.1). Clean mode is run on the sparse graphs to test whether the
sparse selectivity threshold is an artifact of ranking over all N entries.

Per run: final source attention, local effective-distance change (thesis ED_diff to the source), global (all-to-all)
ED change, hierarchy coordinates (Corominas-Murtra and thesis variants, linear thresholds), and the fraction of nodes
whose strongest in-edge at the end is the strongest one at the start (lock-in).

    conda run -n nichenet python -m nichenet.experiments.v_ss
"""

import json
import time
from pathlib import Path

import numpy as np
from hierarchy_coordinates import hierarchy_coordinates
from joblib import Parallel, delayed

from nichenet.core import graphs
from nichenet.core.linalg import row_normalize, rwed
from nichenet.ss import SSParams, run, schedules

OUT = Path(__file__).resolve().parents[3].parent / "data" / "site" / "v_ss.json"
N, STEPS, SOURCE = 60, 300, 1
PHIS = tuple(np.round(np.arange(0, 1.01, 0.1), 2))
KAPPAS = (0.0, 0.2, 0.4, 0.6, 0.8, 0.95)
SEEDS = (0, 1, 2)


def all_to_all_ed(A, delta=10.0, rho=2.6):
    D, _ = rwed(row_normalize(A), delta)
    off = ~np.eye(A.shape[0], dtype=bool)
    return float(D[off].mean())


def one(mode, density, seeding, phi, kappa, seed):
    rng = np.random.default_rng(seed)
    norm = "rows" if mode == "faithful" else "cols"
    A0 = graphs.uniform_random(N, rng, norm) if density == "complete" else graphs.sparse_random(N, 6, rng, norm)
    src = schedules.constant(STEPS, SOURCE) if seeding == "constant" else schedules.random(STEPS, N, rng)
    p = getattr(SSParams, mode)(kappa, phi)
    out = run(A0, src, p)
    A = out["A"]
    hc = hierarchy_coordinates(A)
    hc_thesis = hierarchy_coordinates(A, variant="thesis")
    A0n = A0 / np.maximum(A0.sum(0, keepdims=True), 1e-300)
    lock_in = float(np.mean(np.argmax(A, axis=0) == np.argmax(A0n, axis=0)))
    return dict(mode=mode, density=density, seeding=seeding, phi=float(phi), kappa=float(kappa), seed=seed,
                source_attention=float(out["source_attention"][-1]),
                ed_local_diff=float(out["mean_ed"][-1] - out["mean_ed"][0]),
                ed_global_diff=all_to_all_ed(A) - all_to_all_ed(A0),
                T=hc.treeness, F=hc.feedforwardness, O=hc.orderability,
                T_thesis=hc_thesis.treeness, lock_in=lock_in)


def main(n_jobs=14):
    t0 = time.time()
    jobs = [("faithful", d, s, p, k, seed) for d in ("complete", "sparse") for s in ("constant", "random")
            for p in PHIS for k in KAPPAS for seed in SEEDS]
    jobs += [("clean", "sparse", "constant", p, k, seed) for p in PHIS for k in KAPPAS for seed in SEEDS]
    rows = Parallel(n_jobs=n_jobs)(delayed(one)(*j) for j in jobs)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"n": N, "steps": STEPS, "rows": rows}))
    print(f"{len(rows)} runs in {time.time() - t0:.0f} s -> {OUT}")
    summarize(rows)


def _mean(rows, key, **sel):
    v = [r[key] for r in rows if all(r[k] == x for k, x in sel.items())]
    return float(np.mean(v)) if v else float("nan")


def summarize(rows):
    print("\nV-SS1 constant source, complete graph: source attention / T F O (Corominas) / global ED change")
    for k in (0.0, 0.2, 0.6, 0.95):
        line = []
        for p in (0.0, 0.5, 0.8, 0.9, 1.0):
            sel = dict(mode="faithful", density="complete", seeding="constant", phi=p, kappa=k)
            line.append(f"phi={p:.1f}: {_mean(rows, 'source_attention', **sel):.2f} "
                        f"({_mean(rows, 'T', **sel):.2f},{_mean(rows, 'F', **sel):.2f},{_mean(rows, 'O', **sel):.2f}) "
                        f"dG={_mean(rows, 'ed_global_diff', **sel):+.2f}")
        print(f"  kappa={k:.2f} | " + " | ".join(line))
    print("\nV-SS2 sparse graph (k = 6, 1 - k/N = 0.9), constant source, kappa = 0.2: source attention by phi")
    for mode in ("faithful", "clean"):
        att = [_mean(rows, "source_attention", mode=mode, density="sparse", seeding="constant", phi=p, kappa=0.2)
               for p in PHIS]
        print(f"  {mode:8s} " + " ".join(f"{a:.3f}" for a in att))
    print("\nV-SS3 lock-in (fraction of nodes keeping their initially strongest in-edge), complete, constant, phi = 1")
    lock = {k: _mean(rows, "lock_in", mode="faithful", density="complete", seeding="constant", phi=1.0, kappa=k)
            for k in KAPPAS}
    print("  " + " ".join(f"kappa={k}: {v:.2f}" for k, v in lock.items()))
    print("\nRandom seeding, complete graph: source attention stays near uniform 1/(N-1) =", f"{1 / (N - 1):.3f}")
    rnd = {p: _mean(rows, "source_attention", mode="faithful", density="complete", seeding="random", phi=p, kappa=0.2)
           for p in (0.0, 0.5, 0.9, 1.0)}
    print("  " + " ".join(f"phi={p}: {v:.3f}" for p, v in rnd.items()))


if __name__ == "__main__":
    main()
