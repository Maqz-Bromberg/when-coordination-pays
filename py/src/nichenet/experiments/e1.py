"""E1: optimal reinforcement memory against source persistence, with noisy seeding (extension).

The synthesis note predicted eps* ∝ tau_E^(-1/2) (tau_m* ∝ tau_E^(1/2)). In the thesis model distances are exact, so
without noise the fastest memory always wins and there is no interior optimum. Here a persistent source switches
with mean dwell tau_E (Markov) and each step the seeded node is the true source with probability 1 - nu, else a
random node. Fitness is the time-averaged log-loss of attention on the true source, mean_i -ln A[s_true, i] (lower
is better): the Kelly regret of section 5 of the note. Mean effective distance from the source is not usable: the
RWED depends on T_sk = A_sk / sum_j A_sj, a share, so uniform attention to the source leaves every distance at
delta + ln(N - 1) however large that attention is.

Clean mode, complete graph, N = 30, tempered selection T = 0.3, kappa = 0, so eps sets the memory
tau_m = 1/ln(1 + eps). GPU via ss.jax_kernel.

    XLA_PYTHON_CLIENT_PREALLOCATE=false conda run -n nichenet python -m nichenet.experiments.e1 [eps|kappa]
"""

import json
import sys
import time
from pathlib import Path

import numpy as np

from nichenet.core import graphs
from nichenet.ss import jax_kernel, schedules

KNOB = sys.argv[1] if len(sys.argv) > 1 else "eps"  # "eps" (kappa = 0) or "kappa" (eps = 1)
OUT = Path(__file__).resolve().parents[3].parent / "data" / "site" / ("e1.json" if KNOB == "eps" else "e1_kappa.json")
N, TEMP, KAPPA, NU = 30, 0.3, 0.0, 0.5
TAUS = (10, 30, 100, 300, 1000, 3000)
EPS = np.logspace(-3, 0.5, 15)
# kappa knob: beta_eff = (1 + kappa / T) / 2 at eps = 1, for tau_m from 1.5 to 60 (needs kappa < T)
TAU_M_KAPPA = np.logspace(np.log10(1.5), np.log10(60), 15)
KAPPAS = TEMP * (2 * np.exp(-1 / TAU_M_KAPPA) - 1)
SEEDS = (0, 1, 2, 3)
RECORD = 10


def fitness_curve(tau_E):
    steps = int(max(40 * tau_E, 4000))
    steps -= steps % RECORD
    A0s, masks, obs, tru, eps, kap = [], [], [], [], [], []
    grid = EPS if KNOB == "eps" else KAPPAS
    for g in grid:
        for s in SEEDS:
            rng = np.random.default_rng(1000 * s + 7)
            A0 = graphs.uniform_random(N, rng)
            t = schedules.markov(steps, N, tau_E, rng)
            A0s.append(A0)
            masks.append(graphs.edge_mask(A0))
            tru.append(t)
            obs.append(schedules.noisy(t, N, NU, rng))
            eps.append(g if KNOB == "eps" else 1.0)
            kap.append(KAPPA if KNOB == "eps" else g)
    B = len(eps)
    _, out = jax_kernel.run_batch(np.stack(A0s), np.stack(masks), np.stack(obs), np.array(kap), np.zeros(B),
                                  np.array(eps), np.full(B, TEMP), true_sources=np.stack(tru), tempered=True,
                                  record_every=RECORD)
    ll = np.asarray(out["true_logloss_block"])
    burn = ll.shape[1] // 10
    fit = ll[:, burn:].mean(axis=1).reshape(len(grid), len(SEEDS))
    return steps, fit


def optimum(x, y):
    """Minimum of a quadratic fit of y against log x around the grid minimum."""
    i = int(np.argmin(y))
    lo, hi = max(i - 2, 0), min(i + 3, len(y))
    a, b, _ = np.polyfit(np.log(x[lo:hi]), y[lo:hi], 2)
    return float(np.exp(-b / (2 * a))) if a > 0 and 0 < i < len(y) - 1 else float(x[i])


def main():
    t0 = time.time()
    rows = []
    for tau in TAUS:
        steps, fit = fitness_curve(tau)
        mean = fit.mean(axis=1)
        tau_grid = 1 / np.log1p(EPS) if KNOB == "eps" else TAU_M_KAPPA
        tm_star = optimum(tau_grid, mean)
        se = fit.std(axis=1, ddof=1) / np.sqrt(len(SEEDS))
        rows.append({"tau_E": tau, "steps": steps, "knob": KNOB, "tau_m_grid": tau_grid.tolist(),
                     "fitness_mean": mean.tolist(), "fitness_se": se.tolist(),
                     "tau_m_star": tm_star, "interior": bool(0 < int(np.argmin(mean)) < len(tau_grid) - 1)})
        print(f"[{KNOB}] tau_E={tau:5d} steps={steps:7d}: tau_m*={tm_star:.2f}  interior={rows[-1]['interior']}  "
              f"min log-loss {mean.min():.3f}  {time.time() - t0:.0f}s", flush=True)
    tau = np.array([r["tau_E"] for r in rows])
    tm = np.array([r["tau_m_star"] for r in rows])
    sel = np.array([r["interior"] for r in rows])
    slope = float(np.polyfit(np.log(tau[sel]), np.log(tm[sel]), 1)[0]) if sel.sum() >= 3 else float("nan")
    OUT.write_text(json.dumps({"n": N, "temperature": TEMP, "knob": KNOB, "nu": NU, "rows": rows,
                               "slope_tau_m": slope}))
    print(f"d ln tau_m* / d ln tau_E = {slope:.3f} (prediction 0.5)  -> {OUT}")


if __name__ == "__main__":
    main()
