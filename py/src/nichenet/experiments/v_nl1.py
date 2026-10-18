"""V-NL1: reproduce Lee et al. (2024) Fig. 2c-d with the eigenfunction method.

tau_m* and D* = D(tau_m*) against tau_E for passive agents, stabilizers (alpha = -0.95) and destabilizers
(alpha = +0.95), h0 = 0.2, 1/tau_c = 1e-3, v = 0.1, 40 Chebyshev-Lobatto points in beta (as
pipeline.tau_range_eigen). Fits log-log slopes over the scaling range 10 <= tau_E <= 1e4.

    conda run -n nichenet python -m nichenet.experiments.v_nl1
"""

import json
import time
from pathlib import Path

import numpy as np

from nichenet.nl import NLParams
from nichenet.nl.eigen import chebyshev_fit, chebyshev_min, lobatto_beta, mean_kl_curve

OUT = Path(__file__).resolve().parents[3].parent / "data" / "site" / "v_nl1.json"
TAUS = np.logspace(0, 5, 13)
KINDS = {"passive": 0.0, "stabilizer": -0.95, "destabilizer": 0.95}
FIT_RANGE = (10.0, 1e4)


def main(n_jobs=14):
    betas = lobatto_beta(40)
    out = {"taus": TAUS.tolist(), "fit_range": FIT_RANGE, "kinds": {}}
    t0 = time.time()
    for kind, alpha in KINDS.items():
        rows = []
        for tau in TAUS:
            p = NLParams(tau_E=float(tau), alpha=alpha)
            d, errs = mean_kl_curve(p, betas, n_jobs=n_jobs)
            b_star, d_star = chebyshev_min(chebyshev_fit(betas, d, p.h0, errs))
            rows.append({"tau_E": float(tau), "beta_star": b_star, "tau_m_star": -1 / np.log(b_star),
                         "D_star": d_star, "n_kept": int((errs < 1e-4).sum()),
                         "D_curve": d.tolist(), "errs": errs.tolist()})
            print(f"{kind:12s} tau_E={tau:9.1f}  tau_m*={rows[-1]['tau_m_star']:9.2f}  D*={d_star:.3e}  "
                  f"({rows[-1]['n_kept']}/{betas.size} points kept)  {time.time() - t0:.0f}s", flush=True)
        tau = np.array([r["tau_E"] for r in rows])
        sel = (tau >= FIT_RANGE[0]) & (tau <= FIT_RANGE[1])
        tm = np.array([r["tau_m_star"] for r in rows])
        ds = np.array([r["D_star"] for r in rows])
        slope_tm = float(np.polyfit(np.log(tau[sel]), np.log(tm[sel]), 1)[0])
        slope_d = float(np.polyfit(np.log(tau[sel]), np.log(ds[sel]), 1)[0])
        out["kinds"][kind] = {"alpha": alpha, "rows": rows, "slope_tau_m": slope_tm, "slope_D": slope_d}
        print(f"{kind}: d ln tau_m*/d ln tau_E = {slope_tm:.3f}, d ln D*/d ln tau_E = {slope_d:.3f}")
    out["betas"] = betas.tolist()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out))
    print(f"-> {OUT} ({time.time() - t0:.0f} s)")


if __name__ == "__main__":
    main()
