"""The source-to-structure update (2020 thesis), vectorized numpy reference implementation.

One step for a seeded source s (thesis §3.3, ``graph.py``):
  1. T = row-normalized A; D = RWED from (or to) s with discount delta.
  2. D_s = min_{j != s} D_j / rho, then D is normalized to sum 1 and accumulated over ``update_interval`` sources.
  3. Info score S[k, i] = X_k^(kappa-1) * A[k, i]^kappa (exponent 1-kappa for positive correlation), with X the
     accumulated normalized distances; each column is normalized to sum 1.
  4. Selection keeps the entries at or above the phi quantile of each column (or tempers them), and rescales the
     kept scores to a reward r with column sums 1.
  5. A <- A + eps * r, then the conserved side (columns by default) is renormalized to 1.

This module is the reference for faithful/clean behaviour and runs under Pyodide; ``ss.jax_kernel`` is the
batched fast path for sweeps and is tested against it.
"""

import numpy as np

from ..core.graphs import edge_mask
from ..core.linalg import col_normalize, row_normalize, rwed


def source_distances(A, s, p):
    """Effective distances from (or to) source s with the source's own value replaced by min / rho.

    Returns ``(d, errors)`` with d unnormalized (the thesis's ``eff_dist_to_source_history`` entry).
    """
    T = row_normalize(A)
    if p.distance == "large_delta":
        with np.errstate(divide="ignore"):
            d = p.delta - np.log(T[:, s] if p.eff_dist_to_source else T[s, :])
        d[s] = 0.0
        errors = 0
    else:
        D, errors = rwed(T, p.delta)
        d = (D[:, s] if p.eff_dist_to_source else D[s, :]).copy()
    d[s] = np.delete(d, s).min() / p.source_reward
    return d, errors


def info_scores(A, X, p, mask=None):
    """Column-normalized info scores S[k, i] for every receiving node i (columns)."""
    e = (1.0 - p.kappa) if p.positive_correlation else (p.kappa - 1.0)
    W = A.T if p.adapt_outgoing else A
    S = np.power(X, e)[:, None] * np.power(W, p.kappa)  # numpy, like Python's pow, gives 0**0 = 1
    if mask is not None:
        S = np.where(mask, S, 0.0)
    with np.errstate(invalid="ignore", divide="ignore"):
        return S / S.sum(axis=0, keepdims=True)


def _cutoff_index(phi, count):
    """Index into the ascending sort, as ``sorted(score)[int(phi * N)]`` (the max at phi == 1)."""
    count = np.asarray(count)
    idx = np.floor(phi * count).astype(np.int64)  # int() truncation; phi * count >= 0
    return np.where(phi == 1.0, count - 1, idx)


def select(S, p, mask=None):
    """Reward r[k, i] from column-normalized scores S; each non-empty column of r sums to 1."""
    n = S.shape[0]
    cols = np.arange(S.shape[1])
    if p.selection == "tempered":
        red = np.power(S, 1.0 / p.temperature)
        if mask is not None:
            red = np.where(mask, red, 0.0)
    else:
        if p.rank_over == "in" and mask is not None:
            srt = np.sort(np.where(mask, S, np.inf), axis=0)
            count = mask.sum(axis=0)
            idx = np.clip(_cutoff_index(p.phi, count), 0, n - 1)
            cutoff = srt[idx, cols]
            eligible = mask
        else:
            srt = np.sort(S, axis=0)
            cutoff = srt[int(_cutoff_index(p.phi, n)), cols]
            eligible = np.ones_like(S, dtype=bool) if mask is None else mask
        if p.coupled:
            red = np.where(eligible & (S >= cutoff[None, :]), S, 0.0)
        else:
            red = (eligible & (S > cutoff[None, :])).astype(float)
        # Thesis fallback: if nothing is kept, reward only the best entry with its own score.
        empty = red.sum(axis=0) == 0
        if np.any(empty):
            best_S = np.where(eligible, S, -np.inf)
            for j in np.flatnonzero(empty):
                if np.isfinite(best_S[:, j]).any():
                    k = int(np.argmax(best_S[:, j]))
                    red[:, j] = 0.0
                    red[k, j] = S[k, j]
    with np.errstate(invalid="ignore", divide="ignore"):
        tot = red.sum(axis=0, keepdims=True)
        return np.where(tot > 0, red / np.where(tot > 0, tot, 1.0), 0.0)


def update(A, X, p, mask=None):
    """One edge update given accumulated normalized distances X. Returns the new A."""
    m = None if mask is None else (mask.T if p.adapt_outgoing else mask)
    r = select(info_scores(A, X, p, m), p, m)
    A = A + p.epsilon * (r.T if p.adapt_outgoing else r)
    A = col_normalize(A) if p.conserve_incoming else row_normalize(A)
    if p.undirected:
        A = (A + A.T) / 2.0
        np.fill_diagonal(A, 0.0)
    return A


class SourceToStructure:
    """Stateful SS model. ``step(s)`` seeds one source; edges update every ``update_interval`` sources."""

    def __init__(self, A0, params):
        self.A = np.array(A0, dtype=float)
        self.p = params
        self.mask = edge_mask(self.A) if params.mask_to_edges else None
        self.t = 0
        self.errors = 0
        self._acc = np.zeros(self.A.shape[0])

    def step(self, s):
        d, err = source_distances(self.A, s, self.p)
        self.errors += err
        self._acc += d / d.sum()
        k = self.p.update_interval
        due = (self.t % k == 0) if self.p.update_on_first_step else ((self.t + 1) % k == 0)
        if due:
            self.A = update(self.A, self._acc / self._acc.sum(), self.p, self.mask)
            self._acc = np.zeros_like(self._acc)
        self.t += 1
        return d, due


def run(A0, sources, params, record_A=False, every=1):
    """Run the model over a source schedule.

    Returns a dict with per-step observables (thesis definitions):
      ``mean_ed``: mean effective distance to the source including the source's substituted value
      ``source_attention``: mean in-weight from the source over the other nodes, A[s, i]
    and, if ``record_A``, the matrix after each update (``A_hist[0]`` is A0).
    """
    model = SourceToStructure(A0, params)
    n_rec = (len(sources) + every - 1) // every
    mean_ed = np.empty(n_rec)
    attention = np.empty(n_rec)
    A_hist = [model.A.copy()] if record_A else None
    j = 0
    for t, s in enumerate(sources):
        d, updated = model.step(int(s))
        if record_A and updated:
            A_hist.append(model.A.copy())
        if t % every == 0:
            mean_ed[j] = d.mean()
            attention[j] = np.delete(model.A[int(s)], int(s)).mean()
            j += 1
    out = {"A": model.A, "mean_ed": mean_ed, "source_attention": attention, "errors": model.errors}
    if record_A:
        out["A_hist"] = np.stack(A_hist)
    return out
