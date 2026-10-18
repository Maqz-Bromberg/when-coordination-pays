"""Final networks of the E5 regime map, for the hover previews on the site.

Re-runs seed 0 of every E5 cell (same generator, schedule and start as E5, so the same runs) and stores the final
attention matrix sparsely: per listener, the speakers holding at least MIN_W of its attention, rounded to 2 decimals,
with the true source at the end of the run.

    XLA_PYTHON_CLIENT_PREALLOCATE=false conda run -n nichenet python -m nichenet.experiments.e5_structures
"""

import json
from pathlib import Path

import numpy as np

from nichenet.core import graphs
from nichenet.experiments import e5
from nichenet.ss import jax_kernel

OUT = Path(__file__).resolve().parents[3].parent / "data" / "site" / "e5_structures.json"
MIN_W = 0.04


def main():
    meta, A0s, masks, srcs, kap, temp = [], [], [], [], [], []
    for kind, tau in e5.PERSISTENCE:
        for k in e5.KAPPAS:
            for T in e5.TEMPS:
                rng = np.random.default_rng(1)  # seed 0 of E5
                A0 = graphs.uniform_random(e5.N, rng)
                A0s.append(A0)
                masks.append(graphs.edge_mask(A0))
                srcs.append(e5.schedule(kind, tau, rng))
                kap.append(k)
                temp.append(T)
                meta.append((kind, k, float(T)))
    B = len(meta)
    srcs = np.stack(srcs)
    A, _ = jax_kernel.run_batch(np.stack(A0s), np.stack(masks), srcs, np.array(kap), np.zeros(B), np.ones(B),
                                np.array(temp), tempered=True, record_every=e5.STEPS)
    A = np.asarray(A)
    cells = []
    for b, (kind, k, T) in enumerate(meta):
        a = A[b]
        links = [[int(i), int(kk), round(float(a[kk, i]), 2)] for i in range(e5.N) for kk in range(e5.N)
                 if kk != i and a[kk, i] >= MIN_W]
        cells.append(dict(persistence=kind, kappa=k, T=T, source=int(srcs[b, -1]), links=links))
    OUT.write_text(json.dumps(dict(n=e5.N, min_w=MIN_W, cells=cells), separators=(",", ":")))
    print(f"{B} networks, {sum(len(c['links']) for c in cells)} links -> {OUT} ({OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
