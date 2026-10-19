"""E4: closing the loop. Memory sets the environment's pace, the pace sets the optimal memory.

For a pure population of one type (passive, stabilizer or destabilizer) with memory tau_m, the environment's effective
switching time tau_eff(tau_m) is measured from the flip count (population ABS, nichenet.nl.abs). A rare invader of the
same type (fraction 0.01) best-responds over a memory grid in that environment; BR(tau_m) is the memory with the lowest
invader divergence relative to the residents (paired over seeds). Iterating tau_m -> BR(tau_m) is the adaptive
dynamics; its crossing with the identity is the self-consistent memory tau_m^ of tau_m* ~ c tau_E(tau_m*)^(1/2).
Passive agents are the control: their environment does not depend on memory, so BR is the plain optimum.

    conda run -n nichenet python -m nichenet.experiments.e4
"""

import itertools
import json
import time
from pathlib import Path

import numpy as np
from joblib import Parallel, delayed

from nichenet.nl import NLParams
from nichenet.nl.abs import population_mean_kl

DATA = Path(__file__).resolve().parents[3].parent / "data" / "site"
OUT = DATA / "e4.json"
TYPES = {"passive": 0.0, "stabilizer": -0.95, "destabilizer": 0.95}
TAU_E = (100.0, 1000.0)
TAU_M = np.logspace(np.log10(0.3), np.log10(60.0), 12)
EPS, T, SEEDS = 0.01, 10_000_000, (0, 1)


def beta(tm):
    return float(np.exp(-1.0 / tm))


def resident(kind, tau_E, i, seed):
    p = NLParams(tau_E=tau_E, alpha=TYPES[kind])
    d, flips = population_mean_kl(p, [TYPES[kind]], [1.0], [beta(TAU_M[i])], T=T, seed=seed, return_flips=True)
    return kind, tau_E, i, seed, float(d[0]), float(flips[0])


def pair(kind, tau_E, i, j, seed):
    p = NLParams(tau_E=tau_E, alpha=TYPES[kind])
    a = TYPES[kind]
    d = population_mean_kl(p, [a, a], [1 - EPS, EPS], [beta(TAU_M[i]), beta(TAU_M[j])], T=T, seed=seed)
    return kind, tau_E, i, j, seed, float(d[1] - d[0])


def best_response(diffs):
    """Memory minimizing the mean invader-minus-resident divergence (quadratic fit in log tau_m near the grid min)."""
    k = int(np.argmin(diffs))
    lo, hi = max(k - 2, 0), min(k + 3, len(diffs))
    a, b, _ = np.polyfit(np.log(TAU_M[lo:hi]), diffs[lo:hi], 2)
    return float(np.exp(-b / (2 * a))) if a > 0 and 0 < k < len(diffs) - 1 else float(TAU_M[k])


def crossing(tm, br):
    """Self-consistent memory where BR(tau) = tau (log-linear interpolation) and the BR slope there."""
    g = np.log(br) - np.log(tm)
    for k in range(len(g) - 1):
        if g[k] == 0 or g[k] * g[k + 1] < 0:
            w = g[k] / (g[k] - g[k + 1])
            x = np.exp(np.log(tm[k]) + w * (np.log(tm[k + 1]) - np.log(tm[k])))
            slope = (np.log(br[k + 1]) - np.log(br[k])) / (np.log(tm[k + 1]) - np.log(tm[k]))
            return float(x), float(slope)
    return None, None


def main(n_jobs=14):
    t0 = time.time()
    res = Parallel(n_jobs=n_jobs)(delayed(resident)(k, te, i, s) for k, te, i, s in
                                  itertools.product(TYPES, TAU_E, range(len(TAU_M)), SEEDS))
    pairs = Parallel(n_jobs=n_jobs)(delayed(pair)(k, te, i, j, s) for k, te, i, j, s in
                                    itertools.product(TYPES, TAU_E, range(len(TAU_M)), range(len(TAU_M)), SEEDS))
    out = {"tau_m": TAU_M.tolist(), "eps": EPS, "T": T, "cases": []}
    for kind, te in itertools.product(TYPES, TAU_E):
        D = np.array([np.mean([r[4] for r in res if r[:3] == (kind, te, i)]) for i in range(len(TAU_M))])
        flips = np.array([np.mean([r[5] for r in res if r[:3] == (kind, te, i)]) for i in range(len(TAU_M))])
        tau_eff = (T - 1000) / np.maximum(flips, 1)
        br = np.array([best_response(np.array([np.mean([r[5] for r in pairs if r[:4] == (kind, te, i, j)])
                                               for j in range(len(TAU_M))])) for i in range(len(TAU_M))])
        fixed, slope = crossing(TAU_M, br)
        self_opt = float(TAU_M[int(np.argmin(D))])
        # iterate the BR map (log-linear interpolation) from both ends of the grid
        traj = {}
        for start in (TAU_M[0], TAU_M[-1]):
            x, path = float(start), [float(start)]
            for _ in range(20):
                x = float(np.exp(np.interp(np.log(x), np.log(TAU_M), np.log(br))))
                path.append(x)
            traj[f"{start:.2f}"] = path
        tau_eff_at_fixed = (float(np.exp(np.interp(np.log(fixed), np.log(TAU_M), np.log(tau_eff))))
                            if fixed else None)
        case = {"type": kind, "tau_E": te, "D": D.tolist(), "tau_eff": tau_eff.tolist(), "BR": br.tolist(),
                "fixed_point": fixed, "BR_slope": slope, "self_optimum": self_opt, "tau_eff_at_fixed": tau_eff_at_fixed,
                "trajectories": traj}
        out["cases"].append(case)
        ends = ", ".join(f"{k} -> {v[-1]:.2f}" for k, v in traj.items())
        fp = f"{fixed:.2f} (slope {slope:+.2f}, tau_eff {tau_eff_at_fixed:.0f})" if fixed else "none"
        print(f"{kind:12s} tau_E={te:6.0f}: fixed point {fp}; self-optimum {self_opt:.2f}; iterates {ends}", flush=True)
    OUT.write_text(json.dumps(out))
    print(f"done in {time.time() - t0:.0f} s -> {OUT}")


if __name__ == "__main__":
    main()
