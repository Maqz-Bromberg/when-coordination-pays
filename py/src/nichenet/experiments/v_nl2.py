"""V-NL2: pairwise invasion of pure P, S, D populations (Lee et al. 2024 Fig. 4), tau_E = 100.

    conda run -n nichenet python -m nichenet.experiments.v_nl2
"""

import itertools
import json
import time
from pathlib import Path

import numpy as np
from joblib import Parallel, delayed

from nichenet.nl import NLParams
from nichenet.nl.abs import population_mean_kl
from nichenet.nl.invasion import TYPES, pure_optimum

OUT = Path(__file__).resolve().parents[3].parent / "data" / "site" / "v_nl2.json"
TAU_E, EPS, T, SEEDS = 100.0, 0.01, 20_000_000, (0, 1, 2, 3)
SCALES = (0.5, 0.7, 0.85, 1.0, 1.2, 1.4, 2.0)  # invader memory relative to the incumbent's optimal tau_m


def main(n_jobs=14):
    t0 = time.time()
    base = NLParams(tau_E=TAU_E)
    optima = {k: pure_optimum(base.with_(alpha=a)) for k, a in TYPES.items()}
    tau_star = {k: -1 / np.log(b) for k, (b, _) in optima.items()}
    print("pure optima (eigen):", {k: (round(tau_star[k], 2), f"{d:.3e}") for k, (_, d) in optima.items()})

    mono = {f"{x}<-{y}": bool(optima[y][1] < optima[x][1]) for x, y in itertools.product(TYPES, TYPES) if x != y}

    jobs = []
    for x, y in itertools.product(TYPES, TYPES):
        for sc in SCALES:
            b_inv = float(np.exp(-1 / (tau_star[x] * sc)))
            for s in SEEDS:
                jobs.append((x, y, sc, b_inv, s))

    def run(x, y, sc, b_inv, s):
        d = population_mean_kl(base, [TYPES[x], TYPES[y]], [1 - EPS, EPS], [optima[x][0], b_inv], T=T, seed=s)
        return x, y, sc, s, float(d[0]), float(d[1])

    raw = Parallel(n_jobs=n_jobs)(delayed(run)(*j) for j in jobs)
    shared = {}
    for x, y in itertools.product(TYPES, TYPES):
        best = None
        for sc in SCALES:
            r = [row for row in raw if row[0] == x and row[1] == y and row[2] == sc]
            diff = np.array([row[5] - row[4] for row in r])
            entry = {"scale": sc, "tau_m_invader": tau_star[x] * sc, "diff": float(diff.mean()),
                     "se": float(diff.std(ddof=1) / np.sqrt(len(diff))), "D_inc": float(np.mean([row[4] for row in r])),
                     "D_inv": float(np.mean([row[5] for row in r]))}
            if best is None or entry["diff"] < best["diff"]:
                best = entry
        best["invades"] = bool(best["diff"] + 2 * best["se"] < 0)
        shared[f"{x}<-{y}"] = best
    OUT.write_text(json.dumps({"tau_E": TAU_E, "eps": EPS, "T": T, "seeds": list(SEEDS),
                               "optima": {k: {"beta": b, "tau_m": tau_star[k], "D": d} for k, (b, d) in optima.items()},
                               "monopolized": mono, "shared": shared}, indent=1))
    print(f"done in {time.time() - t0:.0f} s -> {OUT}")
    print("\nmonopolized (Fig. 4b): incumbent <- invader")
    for k, v in mono.items():
        print(f"  {k}: {'invades' if v else '-'}")
    print("\nshared (Fig. 4a): incumbent <- invader: best-response D_inv - D_inc (2 SE), invader tau_m")
    for k, v in shared.items():
        print(f"  {k}: {v['diff']:+.2e} ({2 * v['se']:.1e})  tau_m={v['tau_m_invader']:.2f}  "
              f"{'INVADES' if v['invades'] else '-'}")


if __name__ == "__main__":
    main()
