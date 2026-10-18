"""Parameters of the binary niche-learning model in the paper's notation.

Environment: bias h_E = ±h0, p_E(s) = 1/2 + (s/2) tanh h_E (eq. 2.1). It switches with probability
    q = 1/tau_E + alpha / tau_f,   1/tau_f = (v^2 / tau_E) / ((h - h_E)^2 + v^2)        (eqs. 2.6-2.7)
so alpha < 0 is a stabilizer, alpha > 0 a destabilizer and alpha = 0 a passive agent.
Agent: senses tau_c coin flips per step, estimate h_hat = artanh(mean), aggregates h <- beta h + (1-beta) h_hat
(eq. 2.4), memory tau_m = -1/ln beta (eq. 2.5), cost D_KL(p_E || p_h).

Lee et al.'s code (reference/adaptation) uses v_code = v^2 and the opposite sign convention: v_code > 0 for
stabilizers with weight = |alpha|. ``code_v`` and ``code_weight`` give that mapping.
"""

from dataclasses import dataclass, replace

import numpy as np


def pplus(h):
    return 0.5 + 0.5 * np.tanh(h)


def pminus(h):
    return 0.5 - 0.5 * np.tanh(h)


def entropy(h):
    """Entropy (nats) of a coin with field h."""
    return -pplus(h) * np.log(pplus(h)) - pminus(h) * np.log(pminus(h))


def kl_to_env(h_env, h):
    """D_KL(p_E || p_h) for binary coins with fields h_env and h (nats)."""
    return (pplus(h_env) * (np.log(pplus(h_env)) - np.log(pplus(h)))
            + pminus(h_env) * (np.log(pminus(h_env)) - np.log(pminus(h))))


def tau_m(beta):
    return -1.0 / np.log(beta)


def beta_of(tau_m_):
    return np.exp(-1.0 / np.asarray(tau_m_, dtype=float))


@dataclass(frozen=True)
class NLParams:
    tau_E: float
    h0: float = 0.2
    tau_c: int = 1000  # samples per step ("nBatch"); precision 1/tau_c = 1e-3 in the paper's Fig. 2
    alpha: float = 0.0  # paper sign: < 0 stabilizer, > 0 destabilizer
    v: float = 0.1  # paper v (Fig. 1 caption: v = 0.1), i.e. v_code = 0.01

    def __post_init__(self):
        if self.tau_E < 1:
            raise ValueError("tau_E must be >= 1")
        if not -1.0 <= self.alpha <= 1.0:
            raise ValueError("alpha must be in [-1, 1]")

    def with_(self, **kw):
        return replace(self, **kw)

    @property
    def code_v(self):
        """Lee et al.'s ``v``: v^2 with the sign of the stabilizer convention (positive for stabilizers)."""
        return -np.sign(self.alpha) * self.v ** 2 if self.alpha != 0 else self.v ** 2

    @property
    def code_weight(self):
        return abs(self.alpha)

    def switch_prob(self, dh):
        """Probability that the environment flips next step given agent error dh = h - h_E (clipped to [0, 1])."""
        q = 1.0 / self.tau_E + self.alpha * self.v ** 2 / self.tau_E / (np.asarray(dh) ** 2 + self.v ** 2)
        return np.clip(q, 0.0, 1.0)

    @property
    def infinite_memory_cost(self):
        """D_KL at beta = 1: the agent never learns (h = 0), cost ln 2 - S(h0)."""
        return float(np.log(2) - entropy(self.h0))
