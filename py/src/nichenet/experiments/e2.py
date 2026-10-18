"""E2: the tempered-selection crossover across network sizes (note §8: smooth crossover near T ~ 1/ln N).

Clean SS, complete graphs N in {16, 32, 64, 128, 256}, constant source, tempered selection over T, kappa in {0, 0.3},
eps = 1, 1500 steps, 2 seeds, GPU. Compares the final source attention with the B5 closed form
x* = u*/(u* + N - 2), u* = rho^(1/T_eff), T_eff = (T - kappa)/(1 - kappa), and tests the collapse of the half point at
z = T_eff ln(N - 2) / ln rho = 1.

    XLA_PYTHON_CLIENT_PREALLOCATE=false conda run -n nichenet python -m nichenet.experiments.e2
"""

import json
import time
from pathlib import Path

import numpy as np

from nichenet.continuum import large_delta as ld
from nichenet.core import graphs
from nichenet.ss import jax_kernel, schedules

OUT = Path(__file__).resolve().parents[3].parent / "data" / "site" / "e2.json"
NS = (16, 32, 64, 128, 256)
KAPPAS = (0.0, 0.3)
STEPS, SEEDS, RHO = 1500, (0, 1), 2.6


def temps(kappa):
    return kappa + np.logspace(np.log10(0.03), np.log10(2.0), 16) * (1 - kappa)


def main():
    t0 = time.time()
    rows = []
    for n in NS:
        A0s, masks, srcs, kap, tem, meta = [], [], [], [], [], []
        for k in KAPPAS:
            for T in temps(k):
                for s in SEEDS:
                    rng = np.random.default_rng(10 * s + n)
                    A0 = graphs.uniform_random(n, rng)
                    A0s.append(A0)
                    masks.append(graphs.edge_mask(A0))
                    srcs.append(schedules.constant(STEPS, 0))
                    kap.append(k)
                    tem.append(T)
                    meta.append((k, float(T), s))
        B = len(meta)
        _, obs = jax_kernel.run_batch(np.stack(A0s), np.stack(masks), np.stack(srcs), np.array(kap), np.zeros(B),
                                      np.ones(B), np.array(tem), tempered=True, record_every=STEPS)
        att = np.asarray(obs["source_attention"])[:, -1]
        for (k, T, s), x in zip(meta, att, strict=True):
            T_eff = (T - k) / (1 - k)
            rows.append(dict(n=n, kappa=k, T=T, seed=s, attention=float(x), theory=float(ld.x_star(n, k, T)),
                             z=float(T_eff * np.log(n - 2) / np.log(RHO))))
        err = max(abs(r["attention"] - r["theory"]) for r in rows if r["n"] == n)
        print(f"N={n:4d}: {B} runs, max |simulation - closed form| = {err:.2e}  ({time.time() - t0:.0f} s)", flush=True)
    OUT.write_text(json.dumps({"ns": NS, "kappas": KAPPAS, "steps": STEPS, "rows": rows}))
    for n in NS:
        sel = sorted((r for r in rows if r["n"] == n and r["kappa"] == 0.0 and r["seed"] == 0), key=lambda r: r["z"])
        zs = np.array([r["z"] for r in sel])
        xs = np.array([r["attention"] for r in sel])
        z_half = float(np.interp(0.5, xs[::-1], zs[::-1]))
        print(f"N={n:4d}: attention crosses 1/2 at z = {z_half:.3f} (closed form: 1)")
    print(f"-> {OUT}")


if __name__ == "__main__":
    main()
