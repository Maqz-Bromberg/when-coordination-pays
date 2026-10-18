"""E7: the thesis's update interval as a sampling window (the counterpart of Lee et al.'s tau_c).

The thesis code sums distances from k seeded sources before each edge update (``update_interval``; k = 1 in all
thesis results). With noisy seeding (the seed is the true, persistent source with probability 1 - nu, otherwise a
random node; extension as in E1) a longer window averages out noise but reacts later to a switch.

Clean mode, complete graph N = 30, tempered selection T = 0.3, kappa = 0, eps = 1 (the thesis increment, so memory is
short and the window does the averaging), nu = 0.5, Markov true source with mean dwell tau_E. Fitness: time-averaged
log-loss on the true source, mean_i -ln A[s_true, i] (lower is better), after a 10% burn-in.

    conda run -n nichenet python -m nichenet.experiments.e7 [distances|rewards]
"""

import json
import sys
import time
from pathlib import Path

import numpy as np
from joblib import Parallel, delayed

from nichenet.core import graphs
from nichenet.core.linalg import col_normalize
from nichenet.ss import SSParams, schedules
from nichenet.ss.model import SourceToStructure, info_scores, select, source_distances

# "distances": the thesis rule (sum normalized distances over the window, one update);
# "rewards": average the per-seed rewards over the window, then one update (A <- (A + mean r) / 2).
MODE = sys.argv[1] if len(sys.argv) > 1 else "distances"
DATA = Path(__file__).resolve().parents[3].parent / "data" / "site"
OUT = DATA / ("e7.json" if MODE == "distances" else "e7_rewards.json")
N, TEMP, NU = 30, 0.3, 0.5
TAUS = (10, 30, 100, 300, 1000)
WINDOWS = (1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64)
SEEDS = (0, 1, 2)


def one(tau_E, k, seed):
    rng = np.random.default_rng(1000 * seed + 11)
    steps = int(max(40 * tau_E, 6000))
    A0 = graphs.uniform_random(N, rng)
    true = schedules.markov(steps, N, tau_E, rng)
    seen = schedules.noisy(true, N, NU, rng)
    p = SSParams.clean(0.0, 0.0, selection="tempered", temperature=TEMP, update_interval=k)
    model = SourceToStructure(A0, p)
    burn = steps // 10
    total = 0.0
    r_sum = np.zeros_like(A0)
    for t in range(steps):
        A = model.A
        if t >= burn:
            s = int(true[t])
            col = np.delete(A[s], s)
            total += float(np.mean(-np.log(np.maximum(col, 1e-300))))
        if MODE == "distances":
            model.step(int(seen[t]))
        else:
            d, _ = source_distances(A, int(seen[t]), p)
            r_sum += select(info_scores(A, d / d.sum(), p, model.mask), p, model.mask)
            if (t + 1) % k == 0:
                model.A = col_normalize(A + p.epsilon * r_sum / k)
                r_sum[:] = 0.0
    return dict(tau_E=tau_E, k=k, seed=seed, log_loss=total / (steps - burn))


def optimum(x, y):
    i = int(np.argmin(y))
    lo, hi = max(i - 2, 0), min(i + 3, len(y))
    a, b, _ = np.polyfit(np.log(x[lo:hi]), y[lo:hi], 2)
    return (float(np.exp(-b / (2 * a))) if a > 0 and 0 < i < len(y) - 1 else float(x[i])), bool(0 < i < len(y) - 1)


def main(n_jobs=14):
    t0 = time.time()
    rows = Parallel(n_jobs=n_jobs)(delayed(one)(t, k, s) for t in TAUS for k in WINDOWS for s in SEEDS)
    summary = []
    for tau in TAUS:
        curve = np.array([np.mean([r["log_loss"] for r in rows if r["tau_E"] == tau and r["k"] == k]) for k in WINDOWS])
        k_star, interior = optimum(np.array(WINDOWS, float), curve)
        summary.append({"tau_E": tau, "k_star": k_star, "interior": interior, "curve": curve.tolist()})
        print(f"tau_E={tau:5d}: k*={k_star:6.2f} interior={interior}  log-loss " +
              " ".join(f"{c:.3f}" for c in curve), flush=True)
    t = np.array([s["tau_E"] for s in summary], float)
    ks = np.array([s["k_star"] for s in summary])
    sel = np.array([s["interior"] for s in summary])
    slope = float(np.polyfit(np.log(t[sel]), np.log(ks[sel]), 1)[0]) if sel.sum() >= 3 else None  # JSON has no NaN
    OUT.write_text(json.dumps({"mode": MODE, "n": N, "temperature": TEMP, "nu": NU, "windows": WINDOWS,
                               "rows": rows, "summary": summary, "slope_k": slope}))
    print(f"d ln k* / d ln tau_E = {slope}  ({time.time() - t0:.0f} s) -> {OUT}")


if __name__ == "__main__":
    main()
