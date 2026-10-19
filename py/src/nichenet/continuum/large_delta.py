"""B5: closed forms of the SS map at large delta in the symmetric state.

At delta >> 1 the RWED is D_k = delta - ln T_sk with T_sk = A_sk / sum_j A_sj. Take a constant source and the
symmetric state in which every node puts weight x on the source and (1 - x)/(N - 2) on each peer. Then T_sk is uniform
whatever x is, every relay has the same distance D, and the source's own distance is D / rho. A node's info scores are
    source: (D / rho)^(kappa-1) x^kappa,      each of N - 2 peers: D^(kappa-1) ((1 - x)/(N - 2))^kappa.
With u = x / ((1 - x)/(N - 2)) the source-to-peer score ratio is rho^(1-kappa) u^kappa.

Tempered selection r ∝ S^(1/T) (T = 1 is proportional reward, phi = 0) gives the reward ratio
(rho^(1-kappa) u^kappa)^(1/T), so the fixed point and its stability are
    u* = rho^((1-kappa)/(T-kappa)),   x* = u* / (u* + N - 2),
    contraction per step (1 + eps kappa/T) / (1 + eps)   (stable for T > kappa),
and attention on the source reaches 1/2 at
    T_half = kappa + (1 - kappa) ln(rho) / ln(N - 2).
For T < kappa the symmetric state is unstable: attention condenses onto the source or onto a peer.

The phi cut on a symmetric column only bites when it removes the peers, i.e. for phi >= 1 - 1/N (all peers tie);
its effect below that comes from heterogeneity between peers, outside this reduction.
"""

import numpy as np


def u_star(kappa, T=1.0, rho=2.6):
    if T <= kappa:
        return np.inf
    return rho ** ((1 - kappa) / (T - kappa))


def x_star(n, kappa, T=1.0, rho=2.6):
    """Fixed-point source attention in the symmetric state (T = 1: rho / (rho + N - 2))."""
    u = u_star(kappa, T, rho)
    return 1.0 if np.isinf(u) else u / (u + n - 2)


def contraction(kappa, T=1.0, eps=1.0):
    """Linearized per-step contraction of x around x*; < 1 iff T > kappa."""
    return (1 + eps * kappa / T) / (1 + eps)


def T_half(n, kappa, rho=2.6):
    return kappa + (1 - kappa) * np.log(rho) / np.log(n - 2)


def symmetric_map(x, n, kappa, T=1.0, rho=2.6, eps=1.0):
    """One step of the reduced map x -> (x + eps r(x)) / (1 + eps)."""
    s = (rho ** (1 - kappa) * x ** kappa) ** (1 / T)
    p = ((1 - x) / (n - 2)) ** (kappa / T)
    r = s / (s + (n - 2) * p)
    return (x + eps * r) / (1 + eps)
