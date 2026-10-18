"""Optimal learning in noisy niches (Lee, Flack & Krakauer 2024, Proc. R. Soc. B 291: 20241606)."""

from .params import NLParams, entropy, kl_to_env, pminus, pplus

__all__ = ["NLParams", "entropy", "kl_to_env", "pminus", "pplus"]
