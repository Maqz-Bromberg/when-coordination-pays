---
title: Errata and derivation
result: The model here is the 2020 source-to-structure model with tempered selection, a free memory, a corrected implementation, a moving and noisy source, and new measures. Two errors in the original hierarchy measure are corrected; it underestimated treeness by 0.1–0.25.
implication: Results on this site are stated for this model. The differences from the original are listed here once, so the chapters can present the model on its own terms.
chapter: /model/
chapterLabel: Chapter 1 · The model
---
<!-- fold: Derivation: from the 2020 model to this one -->
## What is kept

Agents with one unit of attention; closeness to the news as the random-walk effective distance D = −ln(Z · Diag(Z)⁻¹),
Z = (I − e^{−δ}P)⁻¹, with δ = 10; the source substitution D_ss = min_k D_sk / ρ with ρ = 2.6; the info score
D_k^{κ−1} A_ki^κ with self-reinforcement κ; and the update that blends rewards into each agent's attention.

## What changes, and why

1. **Selection.** The original rewards only the top fraction (1 − φ) of each agent's links (a hard cut). Here rewards
   are tempered, r ∝ S^{1/T}. The cut is the limit T → 0. Tempering makes the dynamics smooth enough to solve
   (bridges B2–B5, A1–A3) and gives commitment its own dial.
2. **Memory.** The original update fixes the reward weight (ε = 1, a memory of about 1.4 rounds). Here ε is free, with
   τ_m = 1/ln(1 + ε); the cost studies keep ε = 1.
3. **Implementation.** Rewards go only to existing links (the original's 0⁰ = 1 rewarded non-links at κ = 0); each agent
   ranks only its own candidates (the original ranked all N entries, which produced its threshold φ > 1 − ⟨k⟩/N);
   attention is normalized consistently per listener; source schedules are explicit and the random generator is seeded.
   A faithful mode keeps the original behaviours and is used for [validation](/appendix/validation/).
4. **Environment.** The original seeds a constant or a random source. Here the source moves with mean dwell τ_E and the
   news lands on a random agent with probability ν. Without noise, effective distances are exact and the shortest memory
   always wins ([E1](/appendix/e1/)).
5. **Measures.** The original judged networks by mean effective distance. That measure depends on how the source's
   audience is split, not on how much each listener gives the source, so it cannot see concentration (it was 13.09 for
   every setting in E1); its all-pairs version is erratic under noise (2.4, 6.0, 1.9 and 0.1 for ν = 0 to 0.75 at
   N = 10). Here: tracking, log-loss benefit, information cost and broadcast dissipation ([chapter 2](/measures/)).
6. **Pooling.** The original's update interval sums distances over k seeded rounds, which never helps; a window that
   averages rewards does ([E7](/appendix/e7/)).
7. **Hierarchy coordinates.** Matrix powers and the correct set of subgraphs (H1, H2 below), and weighted networks
   scored over 8 weight thresholds.
8. **Extensions.** Reward-rule variants (E9), paid attention (E3), the transport comparison (E6) and the analysis A1–A4
   have no counterpart in the original.

<!-- fold: Errors and implementation notes -->
<!-- include: errata.md -->
