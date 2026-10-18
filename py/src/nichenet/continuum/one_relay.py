"""B4: the one-relay reduction proposed in the synthesis note (§6.3), kept as written for comparison with B5.

Every non-source node puts weight x on a constant source and spreads 1 - x over N - 2 peers. Attending to the source
pays 1, attending to a peer pays gamma x. The softmax fixed point at temperature T is
    x = 1 / (1 + (N - 2) exp(-(1 - gamma x) / T)),   T_half = (1 - gamma/2) / ln(N - 2).
This is a softmax variant in which relays carry weight. At the thesis's delta = 10 the SS map has no such relay gain
(continuum/large_delta.py), where the corresponding result is T_half = kappa + (1 - kappa) ln rho / ln(N - 2).
"""

import numpy as np
from scipy.optimize import brentq


def x_star(n, gamma, T):
    """Unique fixed point (the right-hand side decreases in x)."""
    def f(x):
        return x - 1.0 / (1.0 + (n - 2) * np.exp(-(1.0 - gamma * x) / T))
    return brentq(f, 0.0, 1.0)


def T_half(n, gamma):
    return (1.0 - gamma / 2.0) / np.log(n - 2)
