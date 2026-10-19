"""Finer analysis of the tempered SS map (A1-A4 in docs/results.md).

A1  Exact symmetric reduction. With a constant source s on a complete graph and every non-source node putting weight x
    on s and p = (1 - x)/(N - 2) on each peer, the row s of the transition matrix is uniform over k != s, and by
    permutation symmetry the RWED from s is the same for every k != s at any delta. The source substitution gives
    D_s = D / rho, so the closed forms of large_delta.py hold exactly in the symmetric state, not only for delta >> 1.

A2  Linear stability. The thesis sets the source's own distance to min_k D_k / rho. In the symmetric state all relay
    distances tie, so the map has a kink exactly at its fixed point: it is piecewise smooth, equal near W* to one of
    the N - 1 smooth pieces in which a fixed relay k* attains the minimum. ``tangent_jacobian(..., anchor=k)`` returns
    the eigenvalues of the piece anchored at relay k (by symmetry all pieces have the same spectrum), in the tangent
    space of the per-node budgets. Without ``anchor`` the finite differences straddle the kink and the "spectrum" is
    meaningless (it mixes pieces).

A3  Separatrix below T = kappa. For two dominant entries in a column, the source s and the strongest peer q, the reward
    ratio is (rho^(1-kappa) (w_s/w_q)^kappa)^(1/T). Its fixed point l* = (1 - kappa) ln rho / (T - kappa) for
    l = ln(w_s/w_q) is unstable for T < kappa, so the peer wins (lock-in) iff w_q / w_s > rho^((1-kappa)/(kappa-T)).
    As T -> 0 this is the one-step criterion (w_q/w_s)^kappa > rho^(1-kappa) of the phi = 1 cut.

A4  Noisy-signal mean field (``noisy_fixed_points``; ``noisy_symmetric_walk`` keeps the step-to-step reward noise).
    The true source is seeded with probability 1 - nu, otherwise a uniformly random node.
    In the symmetric state the expected reward on the true source is
        E[r] = (1 - nu + nu/N) f(x) + nu (N - 1)/N g(x),
        f(x) = a / (a + (N - 2) b),           a = (rho^(1-kappa) x^kappa)^(1/T),  b = (p^kappa)^(1/T),
        g(x) = c / (rho^((1-kappa)/T) b + c + (N - 3) b),   c = x^(kappa/T),
    (g: a peer j is seeded, so j carries the rho advantage and s competes as a strong peer). The averaged map
    x -> (x + eps E[r])/(1 + eps) has fixed points x = E[r](x); fluctuations and source switching are ignored.
"""

import numpy as np
from scipy.optimize import brentq

from ..core.linalg import col_normalize
from ..ss.model import info_scores, select, source_distances


def ss_map(W, s, p, mask, anchor=None):
    """One clean-mode SS step for constant source s (update interval 1). With ``anchor`` = k the source's own distance
    is D_k / rho instead of min_k D_k / rho (the smooth piece of the map anchored at relay k)."""
    d, _ = source_distances(W, s, p)
    if anchor is not None:
        from ..core.linalg import row_normalize, rwed
        D, _ = rwed(row_normalize(W), p.delta)
        d = D[s].copy()
        d[s] = d[anchor] / p.source_reward
    r = select(info_scores(W, d / d.sum(), p, mask), p, mask)
    return col_normalize(W + p.epsilon * r)


def tangent_basis(mask):
    """Columns: perturbations that move weight between two in-edges of one node (column sums unchanged)."""
    n = mask.shape[0]
    vecs = []
    for i in range(n):
        ks = np.flatnonzero(mask[:, i])
        for k in ks[1:]:
            v = np.zeros((n, n))
            v[ks[0], i], v[k, i] = -1.0, 1.0
            vecs.append(v[mask])
    return np.array(vecs).T  # (n_masked, n_tangent)


def tangent_jacobian(W, s, p, mask, h=1e-6, anchor=None, return_vectors=False):
    """Eigenvalues (moduli, descending) of dF restricted to the tangent space at W (central differences), for the
    smooth piece anchored at relay ``anchor`` (see A2)."""
    B = tangent_basis(mask)
    Bp = np.linalg.pinv(B)
    cols = []
    for j in range(B.shape[1]):
        dW = np.zeros_like(W)
        dW[mask] = B[:, j] * h
        Fp, Fm = ss_map(W + dW, s, p, mask, anchor), ss_map(W - dW, s, p, mask, anchor)
        cols.append(Bp @ ((Fp - Fm)[mask] / (2 * h)))
    J = np.array(cols).T
    vals, vecs = np.linalg.eig(J)
    order = np.argsort(-np.abs(vals))
    if return_vectors:
        return vals[order], B @ vecs[:, order]
    return np.abs(vals[order])


def separatrix_ratio(kappa, T, rho=2.6):
    """Peer-to-source weight ratio above which a peer wins for T < kappa (A3)."""
    if T >= kappa:
        return np.inf
    return rho ** ((1 - kappa) / (kappa - T))


def noisy_expected_reward(x, n, kappa, T, nu, rho=2.6):
    p = (1 - x) / (n - 2)
    a = (rho ** (1 - kappa) * x ** kappa) ** (1 / T)
    b = (p ** kappa) ** (1 / T)
    c = x ** (kappa / T)
    f = a / (a + (n - 2) * b)
    g = c / (rho ** ((1 - kappa) / T) * b + c + (n - 3) * b)
    return (1 - nu + nu / n) * f + nu * (n - 1) / n * g


def noisy_fixed_points(n, kappa, T, nu, rho=2.6, grid=4000):
    """All fixed points x* of the averaged map in (0, 1), with their stability (slope of E[r] at x* < 1)."""
    xs = np.linspace(1e-6, 1 - 1e-6, grid)
    gvals = noisy_expected_reward(xs, n, kappa, T, nu, rho) - xs
    roots = []
    for k in np.flatnonzero(np.sign(gvals[:-1]) != np.sign(gvals[1:])):
        x0 = brentq(lambda x: noisy_expected_reward(x, n, kappa, T, nu, rho) - x, xs[k], xs[k + 1])
        h = 1e-6
        slope = (noisy_expected_reward(x0 + h, n, kappa, T, nu, rho)
                 - noisy_expected_reward(x0 - h, n, kappa, T, nu, rho)) / (2 * h)
        roots.append((float(x0), bool(slope < 1)))
    return roots


def noisy_symmetric_walk(n, kappa, T, nu, rho=2.6, eps=1.0, steps=20000, seed=0, burn=1000):
    """Stochastic version of A4: the symmetric one-dimensional map with the reward drawn each step (true source seeded
    with probability 1 - nu + nu/N, otherwise a peer). Keeps the symmetric state, but not the averaged reward, so its
    time average includes the fluctuation (Jensen) effects that the averaged map leaves out."""
    rng = np.random.default_rng(seed)
    x, total = 1.0 / (n - 1), 0.0
    p_true = 1 - nu + nu / n
    for t in range(steps):
        p = (1 - x) / (n - 2)
        b = (p ** kappa) ** (1 / T)
        if rng.random() < p_true:
            a = (rho ** (1 - kappa) * x ** kappa) ** (1 / T)
            r = a / (a + (n - 2) * b)
        else:
            c = x ** (kappa / T)
            r = c / (rho ** ((1 - kappa) / T) * b + c + (n - 3) * b)
        x = (x + eps * r) / (1 + eps)
        if t >= burn:
            total += x
    return total / (steps - burn)


def noise_step_reward(x, n, kappa, T, rho=2.6, delta=10.0, relay=True):
    """Reward on the true source s in a step where a peer j is seeded (A4).

    relay=False: s competes as a strong but otherwise ordinary peer (all relay distances equal).
    relay=True:  large-delta relay distances from j. Every non-source node attends mostly to s (weight x), so the
    attention paid to j comes from the peers (p = (1 - x)/(N - 2) each) and from s, whose own in-weights are spread
    (q = 1/(N - 1)). The share T_js = q / (q + (N - 2) p) makes s the closest relay to j: D_s = delta - ln T_js, peers
    D_k = delta - ln T_jk with T_jk = p / (q + (N - 2) p), and j itself gets min(D) / rho.
    """
    p = (1 - x) / (n - 2)
    if not relay:
        b = (p ** kappa) ** (1 / T)
        c = x ** (kappa / T)
        return c / (rho ** ((1 - kappa) / T) * b + c + (n - 3) * b)
    q = 1.0 / (n - 1)
    tot = q + (n - 2) * p
    D_s = delta - np.log(q / tot)
    D_k = delta - np.log(p / tot)
    D_j = min(D_s, D_k) / rho
    score = lambda D, w: (D ** (kappa - 1) * w ** kappa) ** (1 / T)  # noqa: E731
    s_j, s_s, s_k = score(D_j, p), score(D_s, x), score(D_k, p)
    return s_s / (s_j + s_s + (n - 3) * s_k)


def relay_walk(n, kappa, T, nu, rho=2.6, eps=1.0, steps=20000, seed=0, burn=1000, delta=10.0):
    """Stochastic symmetric walk (as ``noisy_symmetric_walk``) with the relay-aware noise-step reward."""
    rng = np.random.default_rng(seed)
    x, total = 1.0 / (n - 1), 0.0
    p_true = 1 - nu + nu / n
    for t in range(steps):
        if rng.random() < p_true:
            p = (1 - x) / (n - 2)
            a = (rho ** (1 - kappa) * x ** kappa) ** (1 / T)
            b = (p ** kappa) ** (1 / T)
            r = a / (a + (n - 2) * b)
        else:
            r = noise_step_reward(x, n, kappa, T, rho, delta, relay=True)
        x = (x + eps * r) / (1 + eps)
        if t >= burn:
            total += x
    return total / (steps - burn)


def column_walk(n, kappa, T, nu, rho=2.6, eps=1.0, steps=20000, seed=0, burn=1000, delta=10.0, reward="rwed"):
    """A4 with peer heterogeneity: one node's full in-weight column (source + N - 2 peers) under the noisy seeds,
    the rest of the network in the symmetric state. Distances as in ``noise_step_reward`` (relay-aware, from the mean
    peer weight) for ``reward="rwed"``; ``reward="likelihood"`` gives the seed a factor rho and everyone else 1.
    Returns the time-averaged weight on the source and the mean peer competition factor
    sum_k w_k^(kappa/T) / ((N - 2) mean(w)^(kappa/T)) (1 in the symmetric state, < 1 when peers are unequal)."""
    rng = np.random.default_rng(seed)
    m = n - 2
    w = np.full(m + 1, 1.0 / (m + 1))  # index 0: source
    p_true = 1 - nu + nu / n
    a = kappa / T
    total, comp = 0.0, 0.0
    for t in range(steps):
        x = w[0]
        if rng.random() < p_true:
            lam = np.ones(m + 1)
            lam[0] = rho ** (1 - kappa)
        else:
            j = 1 + int(rng.integers(m))
            lam = np.ones(m + 1)
            if reward == "rwed":
                q, pbar = 1.0 / (n - 1), (1 - x) / m
                tot = q + m * pbar
                D_s, D_k = delta - np.log(q / tot), delta - np.log(pbar / tot)
                D = np.full(m + 1, D_k)
                D[0] = D_s
                D[j] = min(D_s, D_k) / rho
                lam = D ** (kappa - 1)
            else:
                lam[j] = rho ** (1 - kappa)
        s = (lam * w ** kappa) ** (1 / T)
        w = (w + eps * s / s.sum()) / (1 + eps)
        if t >= burn:
            total += w[0]
            peers = w[1:]
            comp += np.sum(peers ** a) / (m * peers.mean() ** a)
    k = steps - burn
    return total / k, comp / k
