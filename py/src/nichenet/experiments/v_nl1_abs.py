"""V-NL1 check: stabilizer optimal memory at large tau_E by agent-based simulation.

The eigenfunction iteration may stop before stationarity for stabilizers above tau_E ~ 1e4 (docs/validation.md).
Here D(tau_m) is estimated by ABS with run length scaled to ~500 slow-environment flips (T = 1e4 tau_E), and
tau_m* is read from a quadratic fit of log D against log tau_m around the minimum.

    conda run -n nichenet python -m nichenet.experiments.v_nl1_abs
"""

import json
import time
from pathlib import Path

import numpy as np
from joblib import Parallel, delayed

from nichenet.nl import NLParams
from nichenet.nl.abs import mean_kl

OUT = Path(__file__).resolve().parents[3].parent / "data" / "site" / "v_nl1_abs.json"
TAUS = (1e3, 1e4, 3.83e4, 1e5)
TAU_M = np.logspace(0.5, 3, 14)


def fit_minimum(tau_m, d):
    i = int(np.argmin(d))
    lo, hi = max(i - 2, 0), min(i + 3, len(d))
    x, y = np.log(tau_m[lo:hi]), np.log(d[lo:hi])
    a, b, _ = np.polyfit(x, y, 2)
    return float(np.exp(-b / (2 * a))) if a > 0 else float(tau_m[i])


def main(n_jobs=14):
    t0 = time.time()
    rows = []
    for tau in TAUS:
        p = NLParams(tau_E=tau, alpha=-0.95)
        T = int(min(1e4 * tau, 1e9))
        d = np.array(Parallel(n_jobs=n_jobs)(delayed(mean_kl)(p, float(np.exp(-1 / tm)), T=T, seed=j)
                                              for j, tm in enumerate(TAU_M)))
        tm_star = fit_minimum(TAU_M, d)
        rows.append({"tau_E": tau, "T": T, "tau_m": TAU_M.tolist(), "D": d.tolist(), "tau_m_star": tm_star})
        print(f"stabilizer tau_E={tau:9.0f} T={T:.1e}: tau_m* (ABS) = {tm_star:7.2f}  {time.time() - t0:.0f}s",
              flush=True)
    OUT.write_text(json.dumps({"rows": rows}))
    t = np.array([r["tau_E"] for r in rows])
    tm = np.array([r["tau_m_star"] for r in rows])
    print("local slopes:", np.round(np.diff(np.log(tm)) / np.diff(np.log(t)), 3))


if __name__ == "__main__":
    main()
