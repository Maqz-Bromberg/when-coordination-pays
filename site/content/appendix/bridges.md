---
title: B1–B5 · Bridges
result: One update of the model is exactly a forward-Euler step of a logit flow, its fixed points are softmaxes of −ln D at an effective temperature (T − κ)/(1 − κ), and in the symmetric state the whole network reduces to one variable with closed-form fixed point, stability and T½.
implication: The regime boundaries, the size scaling and the noise analysis all rest on these reductions, and they connect the model to replicator dynamics with memory loss.
chapter: /regimes/#boundaries
chapterLabel: Chapter 3 · Three regimes
---
## The reductions

- **B1.** The reward step A ← (A + ε r)/(1 + ε) is an exponential moving average with weight 1/(1 + ε), a memory of
  τ_m = 1/ln(1 + ε).
- **B2.** The step is exactly a forward-Euler step of the logit flow dA/dt = R(A) − A, with step ε/(1 + ε).
- **B3.** Fixed points are column softmaxes in −ln D at T_eff = (T − κ)/(1 − κ), the rest points of Sato–Crutchfield
  replicators with reward −ln D.
- **B5.** In the symmetric large-δ state, u* = ρ^{(1−κ)/(T−κ)}, x* = u*/(u* + N − 2), contraction (1 + εκ/T)/(1 + ε)
  per step, and T½ = κ + (1 − κ) ln ρ / ln(N − 2); the state condenses for T < κ. A1 shows the reduction is exact at any δ
  ([analysis](/appendix/analysis/)).

The large-δ form D ≈ δ − ln P holds while all weights stay above e^{−δ}. Strong selection pushes weights below that, where
two-step paths set the distance.

Tests: `py/tests/test_continuum.py`, `py/tests/test_large_delta.py`.
