"""Erratum H1: effect of the thesis's element-wise path probabilities on hierarchy coordinates.

Evolves faithful-mode SS networks over a coarse (phi, kappa) grid under constant and random seeding, then
computes treeness with three variants: ``thesis`` (as the 2020 code), ``thesis_matrix_power`` (only the matrix
power fixed) and ``corominas`` (Corominas-Murtra et al. 2013). F and O do not depend on the error.

    conda run -n nichenet python -m nichenet.experiments.errata_hierarchy
writes data/site/errata_hierarchy.json and prints a summary.
"""

import json
import time
from pathlib import Path

import numpy as np
from hierarchy_coordinates import hierarchy_coordinates
from joblib import Parallel, delayed

from nichenet.core import graphs
from nichenet.ss import SSParams, run, schedules

N, STEPS = 30, 150
PHIS = (0.0, 0.25, 0.5, 0.75, 0.9, 1.0)
KAPPAS = (0.0, 0.25, 0.5, 0.75, 0.95)
SEEDS = (0, 1, 2)
OUT = Path(__file__).resolve().parents[3].parent / "data" / "site" / "errata_hierarchy.json"


def one(phi, kappa, seeding, seed):
    rng = np.random.default_rng(seed)
    A0 = graphs.uniform_random(N, rng, normalize="rows")
    src = schedules.constant(STEPS, 1) if seeding == "constant" else schedules.random(STEPS, N, rng)
    A = run(A0, src, SSParams.faithful(kappa, phi))["A"]
    row = dict(phi=phi, kappa=kappa, seeding=seeding, seed=seed)
    for thr, exp in (("lin", None), ("exp", 0.5)):
        for variant in ("thesis", "thesis_matrix_power", "corominas"):
            hc = hierarchy_coordinates(A, exp_threshold_distribution=exp, variant=variant)
            row[f"T_{variant}_{thr}"] = hc.treeness
        row[f"F_{thr}"], row[f"O_{thr}"] = hc.feedforwardness, hc.orderability
    return row


def main():
    t0 = time.time()
    jobs = [(p, k, s, seed) for s in ("constant", "random") for p in PHIS for k in KAPPAS for seed in SEEDS]
    rows = Parallel(n_jobs=14)(delayed(one)(*j) for j in jobs)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"n": N, "steps": STEPS, "rows": rows}, indent=1))
    print(f"{len(rows)} networks in {time.time() - t0:.0f} s -> {OUT}")
    for thr in ("lin", "exp"):
        for seeding in ("constant", "random"):
            sel = [r for r in rows if r["seeding"] == seeding]
            th = np.array([r[f"T_thesis_{thr}"] for r in sel])
            mp = np.array([r[f"T_thesis_matrix_power_{thr}"] for r in sel])
            co = np.array([r[f"T_corominas_{thr}"] for r in sel])
            print(f"{thr:3s} {seeding:8s} mean T thesis {th.mean():+.3f}  matrix-power-only {mp.mean():+.3f}  "
                  f"corominas {co.mean():+.3f} | max |thesis - corominas| {np.abs(th - co).max():.3f}, "
                  f"mean {np.abs(th - co).mean():.3f}; sign flips {(np.sign(th) != np.sign(co)).sum()}/{len(sel)}")


if __name__ == "__main__":
    main()
