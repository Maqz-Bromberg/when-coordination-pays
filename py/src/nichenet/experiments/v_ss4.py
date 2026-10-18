"""V-SS4: does the SS transition on complete graphs scale with log N (thesis §5.1.4)?

Faithful mode, constant source, kappa = 0.2, phi grid, N in {15, 30, 60, 120}, 300 steps, 3 seeds. Records final
source attention and the change in all-to-all effective distance, and compares the curves against phi and
against the selection count (1 - phi) N, which is what the rank cut actually controls.

    conda run -n nichenet python -m nichenet.experiments.v_ss4
"""

import json
import time
from pathlib import Path

import numpy as np
from joblib import Parallel, delayed

from nichenet.core import graphs
from nichenet.experiments.v_ss import all_to_all_ed
from nichenet.ss import SSParams, run, schedules

OUT = Path(__file__).resolve().parents[3].parent / "data" / "site" / "v_ss4.json"
NS = (15, 30, 60, 120)
PHIS = tuple(np.round(np.concatenate([np.arange(0, 0.9, 0.1), np.arange(0.9, 1.0001, 0.02)]), 3))
KAPPA, STEPS, SEEDS = 0.2, 300, (0, 1, 2)


def one(n, phi, seed):
    rng = np.random.default_rng(seed)
    A0 = graphs.uniform_random(n, rng, "rows")
    out = run(A0, schedules.constant(STEPS, 1), SSParams.faithful(KAPPA, phi))
    return dict(n=n, phi=float(phi), seed=seed, source_attention=float(out["source_attention"][-1]),
                ed_global_diff=all_to_all_ed(out["A"]) - all_to_all_ed(A0))


def main(n_jobs=14):
    t0 = time.time()
    rows = Parallel(n_jobs=n_jobs)(delayed(one)(n, p, s) for n in NS for p in PHIS for s in SEEDS)
    OUT.write_text(json.dumps({"kappa": KAPPA, "steps": STEPS, "rows": rows}))
    print(f"{len(rows)} runs in {time.time() - t0:.0f} s -> {OUT}")
    for n in NS:
        att = [np.mean([r["source_attention"] for r in rows if r["n"] == n and r["phi"] == p]) for p in PHIS]
        dg = [np.mean([r["ed_global_diff"] for r in rows if r["n"] == n and r["phi"] == p]) for p in PHIS]
        half = next((p for p, a in zip(PHIS, att, strict=True) if a >= 0.5), None)
        kept_at_half = None if half is None else (1 - half) * n
        print(f"N={n:4d}: phi at attention 0.5 = {half}, kept entries (1-phi)N there = {kept_at_half}; "
              f"max global ED change {max(dg):+.2f} (/ln N = {max(dg) / np.log(n):+.2f})")
        print("        attention: " + " ".join(f"{a:.2f}" for a in att))


if __name__ == "__main__":
    main()
