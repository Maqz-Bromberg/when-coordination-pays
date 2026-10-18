"""How each E5 network forms: snapshots of the seed-0 run of every regime-map cell, for the site's slider.

Same runs as e5_structures (seed 0 of E5), advanced in segments so the attention can be saved at log-spaced rounds
(dense early, when structure forms). Per snapshot and listener, the three strongest speakers holding at least MIN_W of
its attention, weights to 2 decimals; plus the true source at that round and the tracking (mean attention of the
others on it). One file per source schedule, loaded by the site on demand.

    XLA_PYTHON_CLIENT_PREALLOCATE=false conda run -n nichenet python -m nichenet.experiments.e5_evolution
"""

import json
from pathlib import Path

import numpy as np

from nichenet.core import graphs
from nichenet.experiments import e5
from nichenet.ss import jax_kernel

OUT = Path(__file__).resolve().parents[3].parent / "data" / "site" / "e5_evolution"
FRAMES = (0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 3000)
TOP, MIN_W = 3, 0.03


def slug(kind):
    return kind.replace(" ", "")


def compact(a, source):
    """Per listener i: [k1, w1, k2, w2, ...] for its strongest speakers; tracking on the source."""
    n = a.shape[0]
    out = []
    for i in range(n):
        col = a[:, i].copy()
        col[i] = -1
        order = np.argsort(-col)[:TOP]
        out.append([v for k in order if col[k] >= MIN_W for v in (int(k), round(float(col[k]), 2))])
    tracking = float((a[source].sum() - a[source, source]) / (n - 1))
    return out, round(tracking, 3)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for kind, tau in e5.PERSISTENCE:
        meta, A0s, masks, srcs, kap, temp = [], [], [], [], [], []
        for k in e5.KAPPAS:
            for T in e5.TEMPS:
                rng = np.random.default_rng(1)  # seed 0 of E5: the same runs as the regime map
                A0 = graphs.uniform_random(e5.N, rng)
                A0s.append(A0)
                masks.append(graphs.edge_mask(A0))
                srcs.append(e5.schedule(kind, tau, rng))
                kap.append(k)
                temp.append(T)
                meta.append((k, float(T)))
        B = len(meta)
        A, mask, srcs = np.stack(A0s), np.stack(masks), np.stack(srcs)
        par = (np.array(kap), np.zeros(B), np.ones(B), np.array(temp))
        frames = [[] for _ in range(B)]
        last = 0
        for t in FRAMES:
            if t > last:
                A, _ = jax_kernel.run_batch(A, mask, srcs[:, last:t], *par, tempered=True, record_every=t - last)
                A = np.asarray(A)
                last = t
            for b in range(B):
                src = int(srcs[b, max(t - 1, 0)])  # the source of the latest round (round 0: the first one)
                links, trk = compact(A[b], src)
                frames[b].append(dict(source=src, tracking=trk, links=links))
        cells = [dict(kappa=k, T=T, frames=frames[b]) for b, (k, T) in enumerate(meta)]
        path = OUT / f"{slug(kind)}.json"
        data = dict(n=e5.N, frames=FRAMES, top=TOP, min_w=MIN_W, cells=cells)
        path.write_text(json.dumps(data, separators=(",", ":")))
        size = path.stat().st_size / 1024
        print(f"{kind}: {B} runs × {len(FRAMES)} frames -> {path.name} ({size:.0f} KB)", flush=True)


if __name__ == "__main__":
    main()
