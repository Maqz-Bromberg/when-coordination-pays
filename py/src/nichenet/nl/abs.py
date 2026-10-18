"""Agent-based simulation (ABS) of the niche-learning model, including a mean-field population of agent types.

Single type: the algorithm of ``jit_learn_passive`` / ``jit_learn_active_binary_noise`` in Lee et al.'s
``pyutils/agent.py``. Each step the environment may flip, the agent draws tau_c coin flips with p+ (h_E), forms
h_hat = artanh(mean) (mean = +-1 nudged by 1e-15), aggregates h <- beta h + (1 - beta) h_hat (first step
(1 - beta) h_hat), and pays D_KL(p_E || p_h). Coin flips are drawn as one binomial instead of tau_c Bernoullis
(same distribution, different random stream).

Population (extension, not in the paper): K agent types with fractions f_k, construction strengths alpha_k and
memories beta_k share one environment. Each type is represented by one agent (mean field) and the switching
probability is
    q = 1/tau_E + sum_k f_k alpha_k (v^2 / tau_E) / ((h_k - h_E)^2 + v^2),  clipped to [0, 1],
which reduces to eqs. 2.6-2.7 for a single type. ``monopolized=True`` gives each type its own environment
driven by its own term only (the paper's Fig. 4b case).
"""

import numpy as np

try:
    from numba import njit
except ImportError:  # Pyodide: plain Python fallback (slow, for small T only)
    def njit(*args, **kwargs):
        if args and callable(args[0]):
            return args[0]
        return lambda f: f


@njit(cache=True)
def _kl(h_env, h):
    pe = 0.5 + 0.5 * np.tanh(h_env)
    pa = 0.5 + 0.5 * np.tanh(h)
    out = 0.0
    t1 = pe * (np.log(pe) - np.log(pa))
    t2 = (1 - pe) * (np.log(1 - pe) - np.log(1 - pa))
    if not np.isnan(t1):
        out += t1
    if not np.isnan(t2):
        out += t2
    return out


@njit(cache=True)
def _population(seed, T, burn, h0, tau_E, tau_c, v, alphas, fracs, betas, monopolized):
    np.random.seed(seed)
    K = alphas.size
    n_env = K if monopolized else 1
    hE = np.full(n_env, h0)
    h = np.zeros(K)
    dsum = np.zeros(K)
    v2 = v * v
    for t in range(T):
        if t > 0:
            for e in range(n_env):
                q = 1.0 / tau_E
                if monopolized:
                    d = h[e] - hE[e]
                    q += alphas[e] * v2 / tau_E / (d * d + v2)
                else:
                    for k in range(K):
                        d = h[k] - hE[e]
                        q += fracs[k] * alphas[k] * v2 / tau_E / (d * d + v2)
                q = min(max(q, 0.0), 1.0)
                if np.random.rand() <= q:
                    hE[e] = -hE[e]
        for k in range(K):
            e = k if monopolized else 0
            p = 0.5 + 0.5 * np.tanh(hE[e])
            mu = 2.0 * np.random.binomial(tau_c, p) / tau_c - 1.0
            if mu == -1.0:
                mu += 1e-15
            elif mu == 1.0:
                mu -= 1e-15
            hhat = np.arctanh(mu)
            h[k] = (1 - betas[k]) * hhat if t == 0 else betas[k] * h[k] + (1 - betas[k]) * hhat
            if t >= burn:
                dsum[k] += _kl(hE[e], h[k])
    return dsum / (T - burn)


def population_mean_kl(params, alphas, fracs, betas, T=2_000_000, burn=1000, seed=0, monopolized=False):
    """Time-averaged D_KL per agent type (array of length K). ``params`` supplies h0, tau_E, tau_c and v."""
    a = np.asarray(alphas, dtype=float)
    f = np.asarray(fracs, dtype=float)
    b = np.asarray(betas, dtype=float)
    if not (a.size == f.size == b.size):
        raise ValueError("alphas, fracs and betas must have the same length")
    return _population(int(seed), int(T), int(burn), float(params.h0), float(params.tau_E), int(params.tau_c),
                       float(params.v), a, f, b, bool(monopolized))


def mean_kl(params, beta, T=2_000_000, burn=1000, seed=0):
    """Single-agent D(beta) with the agent's own alpha (Lee et al.'s ABS)."""
    return float(population_mean_kl(params, [params.alpha], [1.0], [beta], T, burn, seed)[0])
