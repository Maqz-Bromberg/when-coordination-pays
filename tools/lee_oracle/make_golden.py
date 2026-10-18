"""Record D(beta) from Lee et al.'s eigenfunction solver for nichenet.nl.eigen.

    conda run -n lee-ref python tools/lee_oracle/make_golden.py
Writes py/tests/golden/nl_eigen.npz. Parameters follow pipeline.tau_range_eigen (h0 = 0.2, nBatch = 1000,
weight = 0.95, code v = +-0.01) on a reduced grid.
"""

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
# isort: off
from shim import REPO_ROOT, eigen
# isort: on

OUT = REPO_ROOT / "py" / "tests" / "golden" / "nl_eigen.npz"
H0, NBATCH, WEIGHT = 0.2, 1000, 0.95
BETAS = np.array([0.0, 0.3, 0.7, 0.9, 0.97])
CASES = [("passive", 3.0, None), ("passive", 30.0, None), ("passive", 300.0, None),
         ("stabilizer", 30.0, 0.01), ("destabilizer", 30.0, -0.01), ("stabilizer", 3.0, 0.01)]


def main():
    data = {"betas": BETAS, "h0": H0, "nbatch": NBATCH, "weight": WEIGHT}
    for i, (kind, tau, v) in enumerate(CASES):
        if kind == "passive":
            solver = eigen.Passive(tau, H0, 0, NBATCH, L=0.5, dx=2.5e-3)
            d, errs = solver.dkl(BETAS, n_cpus=1, iprint=False)
        else:
            solver = eigen.Active(tau, H0, 0, NBATCH, L=0.5, v=v, weight=WEIGHT, dx=2.5e-3)
            d, errs, _ = solver.dkl(BETAS, n_cpus=1, iprint=False, tmax=1500 if v > 0 else 1000)
        data[f"kind_{i}"], data[f"tau_{i}"] = kind, tau
        data[f"v_{i}"] = np.nan if v is None else v
        data[f"dkl_{i}"], data[f"errs_{i}"] = d, errs.ravel()
        print(kind, tau, np.round(d, 6))
    np.savez_compressed(OUT, **data)


if __name__ == "__main__":
    main()
