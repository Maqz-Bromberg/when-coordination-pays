"""Initial weighted graphs for the source-to-structure model.

``normalize="rows"`` reproduces the thesis code, which normalizes out-weight at initialization even though the
dynamics conserve in-weight. ``normalize="cols"`` (clean mode) starts with conserved in-weight.
All graphs are simple: zero diagonal.
"""

import numpy as np

from .linalg import col_normalize, row_normalize


def _finish(A, normalize):
    np.fill_diagonal(A, 0.0)
    if normalize == "rows":
        return row_normalize(A)
    if normalize == "cols":
        return col_normalize(A)
    raise ValueError(f"normalize must be 'rows' or 'cols', got {normalize!r}")


def uniform_random(n, rng, normalize="cols"):
    """Complete graph with U(0, 1) weights (the thesis default initialization)."""
    return _finish(rng.random((n, n)), normalize)


def sparse_random(n, k, rng, normalize="cols"):
    """Every node gets k out-edges with equal weight, as in ``Graph.sparse_random_edge_init``.

    Out-edges are drawn without replacement (the thesis code allowed repeats). Any node left with no in-edge is
    given one from a random node, so every column is non-empty.
    """
    if not 1 <= k <= n - 1:
        raise ValueError("need 1 <= k <= n - 1")
    A = np.zeros((n, n))
    for node in range(n):
        targets = rng.choice(np.delete(np.arange(n), node), size=k, replace=False)
        A[node, targets] = 1.0
    for j in np.flatnonzero(A.sum(axis=0) == 0):
        A[rng.choice(np.delete(np.arange(n), j)), j] = 1.0
    return _finish(A, normalize)


def from_density(n, rho, rng, normalize="cols"):
    """Sparse graph with k = round(rho * (n - 1)) out-edges per node; rho = 1 gives the complete uniform graph."""
    k = round(rho * (n - 1))
    return uniform_random(n, rng, normalize) if k >= n - 1 else sparse_random(n, k, rng, normalize)


def edge_mask(A):
    """Boolean support of A without the diagonal: the fixed edge set used by clean mode."""
    M = A > 0
    np.fill_diagonal(M, False)
    return M
