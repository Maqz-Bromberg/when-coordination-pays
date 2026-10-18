"""Pairwise invasion of pure populations (Lee et al. 2024 Result 3, Fig. 4).

Types are passive (P, alpha = 0), stabilizer (S, alpha < 0) and destabilizer (D, alpha > 0).

Monopolized niches (Fig. 4b): each type experiences only the environment it builds. An invader Y at its own optimum
invades X at its optimum iff D*(Y) < D*(X), with pure optima from the eigenfunction solver.

Shared niche (Fig. 4a): the paper argues verbally. Here it is made explicit with the mean-field population ABS
(``abs.population_mean_kl``): an incumbent X at its self-consistent optimum beta*_X shares the environment with an
invader Y at fraction eps. The invader best-responds over a grid of memories; Y invades X if its time-averaged
divergence is below the incumbent's in the same run. Differences are paired over seeds (same environment within a
run) and reported with their standard error.
"""

from dataclasses import dataclass

import numpy as np

from .abs import population_mean_kl
from .eigen import chebyshev_fit, chebyshev_min, lobatto_beta, mean_kl_curve
from .params import NLParams

TYPES = {"P": 0.0, "S": -0.95, "D": 0.95}


def pure_optimum(params: NLParams, deg=24, n_jobs=1):
    """(beta*, D*) for a pure population of params.alpha agents (eigenfunction + Chebyshev, as Fig. 2)."""
    betas = lobatto_beta(deg)
    d, errs = mean_kl_curve(params, betas, n_jobs=n_jobs)
    return chebyshev_min(chebyshev_fit(betas, d, params.h0, errs))


@dataclass
class InvasionResult:
    incumbent: str
    invader: str
    beta_incumbent: float
    beta_invader: float  # best response
    D_incumbent: float
    D_invader: float
    diff: float  # D_invader - D_incumbent (negative: invasion)
    se: float

    @property
    def invades(self):
        return self.diff + 2 * self.se < 0


def shared_invasion(base: NLParams, incumbent, invader, beta_incumbent, invader_betas, eps=0.01, T=20_000_000,
                    seeds=(0, 1, 2, 3)):
    """Best response of an invader at fraction eps in the environment shared with an incumbent at beta_incumbent."""
    alphas = [TYPES[incumbent], TYPES[invader]]
    fracs = [1 - eps, eps]
    best = None
    for b in invader_betas:
        diffs, d_inc, d_inv = [], [], []
        for s in seeds:
            d = population_mean_kl(base, alphas, fracs, [beta_incumbent, b], T=T, seed=s)
            d_inc.append(d[0])
            d_inv.append(d[1])
            diffs.append(d[1] - d[0])
        diffs = np.array(diffs)
        res = InvasionResult(incumbent, invader, float(beta_incumbent), float(b), float(np.mean(d_inc)),
                             float(np.mean(d_inv)), float(diffs.mean()), float(diffs.std(ddof=1) / np.sqrt(len(seeds))))
        if best is None or res.diff < best.diff:
            best = res
    return best
