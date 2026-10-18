# Experiment results

Each section names its script and data file. "Extension" marks assumptions beyond the 2020 thesis and Lee et al.

## E1: optimal reinforcement memory against source persistence

**Prediction (note §6.1, §8):** ε* ∝ τ_E^{−1/2}, i.e. τ_m* = 1/ln(1+ε*) ∝ τ_E^{1/2}.

**Two prerequisites the thesis model lacks:**

1. **Sensing noise.** Effective distances are exact, so with a persistent source the fastest memory always wins.
   Extension: noisy seeding. The seeded node is the true source with probability 1 − ν and a random node otherwise
   (ν = 0.5). The true source jumps with mean dwell time τ_E.
2. **A fitness that sees attention.** Mean effective distance from the source is flat (13.09 for every ε and τ_E).
   The RWED depends on T_sk = A_sk / Σ_j A_sj, a share, so uniform attention to the source leaves every distance at
   δ + ln(N − 1). The fitness used is log-loss on the true source, mean_i −ln A[s, i]: the Kelly regret of note §5.

**Setup:** clean mode, N = 30, complete graph, tempered selection T = 0.3, 15 memories, 4 seeds, run length 40 τ_E,
on the GPU. Script: `python -m nichenet.experiments.e1 [eps|kappa]`.

| τ_E | 10 | 30 | 100 | 300 | 1000 | 3000 | slope |
|---|---|---|---|---|---|---|---|
| τ_m* with ε as memory (κ = 0) | 1.93 | 3.08 | 5.04 | 8.16 | 13.7 | 23.3 | 0.43 (local 0.42 → 0.49) |
| τ_m* with κ as memory (ε = 1) | 6.19 | 8.09 | 9.31 | 11.6 | 13.9 | 15.3 | 0.16 |

- **The prediction holds for ε** once noise is present. The exponent approaches ½ from below, as in Lee et al.'s model.
- **κ is a commitment knob, not a memory knob.** As κ → T the fixed point condenses onto the source
  (u* = ρ^{(1−κ)/(T−κ)}), so log-loss falls to 0.02 against 1.4 for ε, and the optimum hardly moves with τ_E.

## Bridges (B2, B3, B5)

- **B2.** The SS step is exactly a forward-Euler step of the logit flow dW/dt = R(W) − W, with step ε/(1+ε).
- **B3.** Fixed points are column softmaxes in −ln D at T_eff = (T − κ)/(1 − κ), shared with Sato–Crutchfield
  replicators.
- **B5.** The symmetric large-δ state gives u* = ρ^{(1−κ)/(T−κ)} and T_½ = κ + (1 − κ) ln ρ / ln(N − 2), and condenses
  for T < κ. The reduction holds while all weights stay above e^{−δ}. Selective cuts push weights below that, where
  two-hop paths set the distance.

Tests: `py/tests/test_continuum.py`, `py/tests/test_large_delta.py`.
