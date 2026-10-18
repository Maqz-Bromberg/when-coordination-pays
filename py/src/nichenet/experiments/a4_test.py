"""A4 test: what closes the gap between the noisy mean field and the simulation near T = kappa?

A 2 x 2 factorial on the complete graph with a constant true source and noisy seeding (as in E8):
  reward      RWED (thesis)  or  likelihood (the seed gets a factor rho, everyone else 1: no relays)
  peers       free           or  symmetrized after every update (each column's peer weights set to their mean)
against four reductions of A4:
  symmetric walk   symmetric state, no relays          (should match likelihood + symmetrized)
  relay walk       symmetric state, relay-aware         (should match RWED + symmetrized)
  column walk      one heterogeneous column, likelihood (tests peer heterogeneity without relays)
  column walk      one heterogeneous column, relay-aware
N in {10, 20, 40, 80}, nu in {0.25, 0.5, 0.75}, T in {0.25, 0.3, 0.35, 0.45}, kappa = 0.2, eps = 1, 4000 steps
(second half averaged), 2 seeds, GPU.

    XLA_PYTHON_CLIENT_PREALLOCATE=false conda run -n nichenet python -m nichenet.experiments.a4_test
"""

import json
import time
from pathlib import Path

import numpy as np
from joblib import Parallel, delayed

from nichenet.continuum import analysis as an
from nichenet.core import graphs
from nichenet.ss import jax_kernel, schedules

OUT = Path(__file__).resolve().parents[3].parent / "data" / "site" / "a4_test.json"
NS, NUS, TEMPS = (10, 20, 40, 80), (0.25, 0.5, 0.75), (0.25, 0.3, 0.35, 0.45)
KAPPA, STEPS, BLOCK, SEEDS = 0.2, 4000, 500, (0, 1)


def walks(n, nu, T):
    cr, cr_comp = an.column_walk(n, KAPPA, T, nu, reward="rwed")
    cl, cl_comp = an.column_walk(n, KAPPA, T, nu, reward="likelihood")
    return dict(sym_walk=an.noisy_symmetric_walk(n, KAPPA, T, nu), relay_walk=an.relay_walk(n, KAPPA, T, nu),
                column_lik=cl, column_rwed=cr, competition_lik=cl_comp, competition_rwed=cr_comp)


def main():
    t0 = time.time()
    rows = []
    for n in NS:
        meta, A0s, obs = [], [], []
        for nu in NUS:
            for T in TEMPS:
                for s in SEEDS:
                    rng = np.random.default_rng(1000 * s + 17 * n)
                    A0s.append(graphs.uniform_random(n, rng))
                    obs.append(schedules.noisy(np.zeros(STEPS, dtype=np.int64), n, nu, rng))
                    meta.append((nu, T, s))
        B = len(meta)
        A0 = np.stack(A0s)
        mask = np.stack([graphs.edge_mask(a) for a in A0])
        obs = np.stack(obs)
        tru = np.zeros_like(obs)
        par = (np.full(B, KAPPA), np.zeros(B), np.ones(B), np.array([m[1] for m in meta]))
        sims = {}
        for reward in ("rwed", "likelihood"):
            for sym in (False, True):
                _, o = jax_kernel.run_batch(A0, mask, obs, *par, true_sources=tru, tempered=True, record_every=BLOCK,
                                            reward=reward, symmetrize=sym)
                att = np.asarray(o["true_attention_block"])
                sims[(reward, sym)] = att[:, att.shape[1] // 2:].mean(axis=1)
        cells = sorted({(nu, T) for nu, T, _ in meta})
        ws = Parallel(n_jobs=12)(delayed(walks)(n, nu, T) for nu, T in cells)
        for (nu, T), w in zip(cells, ws, strict=True):
            idx = [b for b, m in enumerate(meta) if m[:2] == (nu, T)]
            rows.append(dict(n=n, nu=nu, T=T, **{f"{r}{'_sym' if sym else ''}": float(np.mean(v[idx]))
                                                for (r, sym), v in sims.items()}, **w))
            r = rows[-1]
            print(f"N={n:2d} nu={nu:.2f} T={T:.2f}: rwed {r['rwed']:.3f} sym {r['rwed_sym']:.3f} relay-walk "
                  f"{r['relay_walk']:.3f} column {r['column_rwed']:.3f} | lik {r['likelihood']:.3f} sym "
                  f"{r['likelihood_sym']:.3f} sym-walk {r['sym_walk']:.3f} column {r['column_lik']:.3f} "
                  f"(competition {r['competition_lik']:.2f})", flush=True)
        print(f"N={n}: {time.time() - t0:.0f} s", flush=True)
    OUT.write_text(json.dumps(dict(ns=NS, nus=NUS, temps=TEMPS, kappa=KAPPA, steps=STEPS, rows=rows)))
    print(f"-> {OUT}")


if __name__ == "__main__":
    main()
