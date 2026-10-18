"""B1: memory conversions for the SS update and the niche learner.

The SS step w <- (w + eps r) / (1 + eps) is an exponential moving average with beta = 1 / (1 + eps) and memory
tau_m = -1 / ln beta = 1 / ln(1 + eps). With the info-score exponent kappa, the linearized memory near the
symmetric fixed point is beta_eff = (1 + eps kappa / T) / (1 + eps) (T = 1 for proportional reward).
"""

import numpy as np


def beta_of_eps(eps):
    return 1.0 / (1.0 + np.asarray(eps, float))


def eps_of_beta(beta):
    return 1.0 / np.asarray(beta, float) - 1.0


def tau_m_of_beta(beta):
    return -1.0 / np.log(beta)


def beta_of_tau_m(tau_m):
    return np.exp(-1.0 / np.asarray(tau_m, float))


def tau_m_of_eps(eps):
    return 1.0 / np.log1p(eps)


def beta_eff(kappa, eps=1.0, T=1.0):
    return (1.0 + eps * kappa / T) / (1.0 + eps)
