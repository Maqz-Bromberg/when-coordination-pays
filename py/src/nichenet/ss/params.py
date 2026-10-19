"""Parameters of the source-to-structure (SS) model of the 2020 thesis.

``SSParams.faithful`` reproduces ``reference/Networks_Via_Diffusion/graph.py`` step for step, including its
implementation quirks. ``SSParams.clean`` fixes each quirk; every fix is a separate field so any one can be
switched back on. See docs/errata.md (Q1-Q7) for the quirk table.
"""

from dataclasses import dataclass, replace


@dataclass(frozen=True)
class SSParams:
    kappa: float  # edge conservation: 0 = pure distance, 1 = pure existing weight
    phi: float  # selectivity: entries below the phi quantile of the info score get no reward
    delta: float = 10.0  # RWED discount (thesis: 10)
    source_reward: float = 2.6  # rho: the source's own distance is set to min(D) / rho (thesis: 2.6)
    epsilon: float = 1.0  # reward weight; A <- (A + eps * r) then renormalize. The thesis code has eps = 1
    coupled: bool = True  # reward proportional to info score (True) or a constant 1 per kept edge (False)
    selection: str = "top_fraction"  # "top_fraction" (phi cut) or "tempered" (r ∝ S^(1/temperature))
    temperature: float = 1.0
    rank_over: str = "all"  # phi quantile over all N entries ("all", thesis) or over in-neighbours ("in")
    mask_to_edges: bool = False  # restrict rewards to the initial edge set, no self-loops (thesis: False)
    distance: str = "rwed"  # "rwed" (thesis) or "large_delta": D = delta - ln T_sj, exact up to O(e^-delta) (B5)
    update_interval: int = 1  # seeded sources summed per update
    update_on_first_step: bool = True  # thesis updates at t % k == 0 (also after the first source); clean: (t+1) % k
    # Directionality binaries (thesis appendix 7.4.1); defaults are the thesis base case.
    eff_dist_to_source: bool = False
    positive_correlation: bool = False
    adapt_outgoing: bool = False
    conserve_incoming: bool = True
    undirected: bool = False

    def __post_init__(self):
        if self.selection not in ("top_fraction", "tempered"):
            raise ValueError(f"unknown selection {self.selection!r}")
        if self.distance not in ("rwed", "large_delta"):
            raise ValueError(f"unknown distance {self.distance!r}")
        if self.rank_over not in ("all", "in"):
            raise ValueError(f"unknown rank_over {self.rank_over!r}")
        if not 0.0 <= self.phi <= 1.0:
            raise ValueError("phi must be in [0, 1]")
        if self.update_interval < 1:
            raise ValueError("update_interval must be >= 1")

    @classmethod
    def faithful(cls, kappa, phi, **kw):
        return cls(kappa=kappa, phi=phi, **kw)

    @classmethod
    def clean(cls, kappa, phi, **kw):
        base = dict(rank_over="in", mask_to_edges=True, update_on_first_step=False)
        base.update(kw)
        return cls(kappa=kappa, phi=phi, **base)

    def with_(self, **kw):
        return replace(self, **kw)

    @property
    def beta_eff(self):
        """Linearized memory near the symmetric fixed point (B5): (1 + kappa) / 2 for epsilon = 1."""
        return (1.0 + self.kappa * self.epsilon) / (1.0 + self.epsilon)
