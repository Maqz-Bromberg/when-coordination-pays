"""B2/B3: the SS map as a discretized flow, its continuum limits and its self-consistent fixed points.

For tempered selection (r ∝ S^(1/T), S_ki = D_k^(kappa-1) w_ki^kappa over in-neighbours k of i) and a constant
source s:

1. The discrete update W' = (W + eps R(W)) / (1 + eps) is exactly one forward-Euler step of
       dW/dt = R(W) - W        (smoothed best-response / logit dynamics)
   with step h = eps / (1 + eps). So the eps -> 0 limit of the SS model is logit dynamics, not replicator dynamics.

2. Fixed points satisfy w_ki ∝ (D_k^(kappa-1) w_ki^kappa)^(1/T), i.e. a column softmax in -ln D:
       w_ki ∝ D_k^(-1/T_eff),   T_eff = (T - kappa) / (1 - kappa),
   self-consistent because D depends on W through the RWED. (phi = 0 proportional reward is T = 1.)

3. Sato & Crutchfield's replicator dynamics with memory loss,
       dw/dt = w [b (r - <r>) - a (ln w - <ln w>)],
   with reward r_k = -ln D_k, b = (1 - kappa)/T and a = 1 - kappa/T, has the same fixed points (its softmax
   temperature a/b = T_eff). The two flows share fixed points but not their transient dynamics or stability.
"""

import numpy as np

from ..core.graphs import edge_mask
from ..ss.model import info_scores, select, source_distances


def T_eff(kappa, T):
    return (T - kappa) / (1 - kappa)


def reward(W, s, p, mask):
    """R(W): the tempered SS reward for constant source s (columns sum to 1 over the mask)."""
    d, _ = source_distances(W, s, p)
    return select(info_scores(W, d / d.sum(), p, mask), p, mask)


def logit_flow(W, s, p, mask):
    return reward(W, s, p, mask) - W


def sato_crutchfield_flow(W, s, p, mask):
    """Replicator with memory loss, reward -ln D_k, coefficients mapped from (kappa, T) as in the module docstring."""
    d, _ = source_distances(W, s, p)
    r = np.where(mask, -np.log(d)[:, None], 0.0)
    lw = np.where(mask, np.log(np.where(mask, W, 1.0)), 0.0)
    b, a = (1 - p.kappa) / p.temperature, 1 - p.kappa / p.temperature
    rbar = np.sum(W * r, axis=0, keepdims=True)
    lbar = np.sum(W * lw, axis=0, keepdims=True)
    return np.where(mask, W * (b * (r - rbar) - a * (lw - lbar)), 0.0)


def fixed_point(W0, s, p, mask=None, damping=0.5, tol=1e-12, max_iter=20000):
    """Self-consistent W* = R(W*) by damped iteration (the SS map itself with eps = damping / (1 - damping))."""
    mask = edge_mask(W0) if mask is None else mask
    W = np.array(W0, dtype=float)
    for it in range(max_iter):
        new = (1 - damping) * W + damping * reward(W, s, p, mask)
        if np.max(np.abs(new - W)) < tol:
            return new, it + 1
        W = new
    return W, max_iter
