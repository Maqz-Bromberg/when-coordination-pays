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

## E6: what keeps loops, the budget or the reward?

**Question (note §6.4, PLAN.md §3):** the source-to-structure model and adaptive transport networks both reinforce
edges by use. Which ingredient decides tree versus loops?

**Design:** a 2 × 2 factorial (`nichenet/compare.py`). Every cell runs W ← (1 − η)W + η·N[U^p] on the same 7 × 7
lattice with the same source schedule. They differ only in two factors:

- **Budget N:** per-node in-weight (SS) or one global sum (transport).
- **Usage U of edge k → i:** the SS info score D_k^{κ−1} W_ki^κ (RWED), or the squared Kirchhoff current I_e² when the
  source broadcasts to all nodes (flux).

The per-node/RWED corner equals clean SS with tempered selection (T = 1/p). The global/flux corner has Corson's
optimum as its constant-source fixed point (γ = 1/p − 1). Both are tested in `py/tests/test_compare.py`.

**Setup:** p from 0.4 to 20, η = 0.05, 3000 steps, 3 seeds; sources constant at a corner, Markov (τ_E = 50) or random.
Loops count the independent cycles of the backbone, the edges carrying at least 0.1 of the receiving node's strongest
in-weight. Script: `python -m nichenet.experiments.e6`. Data: `data/site/e6.json`.

Mean loops (maximum 36) under a constant / random source:

| cell | p = 0.5 | 0.67 | 1 | 2 | 3 | 5 | 10 |
|---|---|---|---|---|---|---|---|
| node, flux | 36 / 36 | 5.7 / 36 | 0 / 32.7 | 0 / 18.7 | 0 / 18.0 | 0 / 17.3 | 0 / 16.3 |
| global, flux | 36 / 36 | 0 / 14.3 | 0 / 3.3 | 0 / 0.7 | collapsed / 0 | collapsed / 0 | collapsed |
| node, RWED, κ = 0 | 36 / 36 | 36 / 36 | 36 / 36 | 36 / 36 | 36 / 36 | 36 / 36 | 36 / 36 |
| node, RWED, κ = 0.25 | 36 / 36 | 36 / 36 | 36 / 36 | 36 / 36 | 36 / 36 | 0 / 25 | 0 / 1 |
| node, RWED, κ = 0.5 | 36 / 36 | 36 / 36 | 36 / 36 | 36 / 35.3 | 0 / 0 | 0 / 0 | 0 / 0 |

"Collapsed" means that in most seeds the edges carrying at least 10⁻¹⁰ of the largest weight no longer connect all
nodes. The global budget has concentrated onto part of the graph, so loop counts are not meaningful. For flux this is
partly numerical: leaf conductances fall below the solver's 10⁻¹² relative floor. A per-node budget never collapses,
because every node keeps an in-edge. Under a moving source with κ > 0 it can fragment instead: some seeds lock into
several separate trees, a forest. That is a real outcome, and the loop count (E − V + components) handles it.

**Findings:**

1. **Trees need self-reinforcement.** The flux reward reinforces itself: a stronger edge carries more current. The
   RWED reward at κ = 0 does not. It depends only on the sender's distance, so two equally distant parents tie
   forever, and the lattice keeps every loop at any concentration. The thesis's κ (the W^κ factor) supplies the
   missing self-reinforcement. Trees appear past p ≈ 1/κ, where B5 predicts the symmetric state loses stability
   (T = κ): between p = 3 and 5 for κ = 0.25, and at p = 3 for κ = 0.5.
2. **Fluctuating sources keep loops only with the flux reward.** With flux, a random source keeps 15–36 loops under
   the per-node budget. Under the global budget loops survive only near the transition (14 at p = 0.67). With the RWED
   reward, a random source only delays the transition (κ = 0.25: trees from p = 10 instead of 5), and past it the
   network locks into some tree whatever the source does. The note's analogy, that load fluctuation plays the role of
   1/τ_E, holds for the transport reward and not for the thesis reward.
3. **The budget sets robustness and cost, not the tree/loop distinction.** A per-node budget forces every node to keep
   an in-edge. Strong concentration gives trees or forests, never a collapse, and dissipation averaged over all
   broadcast sources rises at most about 4.5-fold over the uniform lattice. A global budget puts the tree transition
   exactly at Corson's p = 1/2 (γ = 1). At strong concentration it collapses onto a few edges, and averaged
   dissipation grows by many orders of magnitude.

## E5: computed phase diagram

**Question (note §5):** the note sketched three regimes of attention structure, distributed, hierarchy and
over-betting, against source predictability and commitment. Do they exist, and where are the boundaries?

**Setup:** clean mode, complete graph N = 30, tempered selection over T ∈ [0.05, 2] (14 values), κ ∈ {0, 0.2, 0.4,
0.6}, ε = 1. Sources: constant, Markov with mean dwell 1000, 100 or 10 steps, or random every step. 3000 steps,
3 seeds, GPU. Script: `python -m nichenet.experiments.e5`. Data: `data/site/e5.json`.

The regime of a run is set by two quantities:

- **commitment:** the mean over nodes of the largest in-weight in the final network;
- **tracking:** attention on the current source, averaged over the second half of the run.

A run is distributed if commitment is below ½, hierarchy if it is committed and tracking is at least half the
commitment, and over-betting if it is committed but tracking falls short of that.

**Results** (majority regime of three seeds):

- **Constant source:** hierarchy below T½ and distributed above, for every κ. The boundary falls exactly at the B5
  closed form T½ = κ + (1 − κ) ln ρ / ln(N − 2): 0.29, 0.43, 0.57 and 0.71 for κ = 0, 0.2, 0.4 and 0.6.
- **Any moving source with κ > 0:** below T = κ the network over-bets. The symmetric state is unstable there (B5), so
  attention condenses onto whichever node is ahead, and after the first switch that is a stale node. Between κ and T½
  it forms a hierarchy that tracks the source, and above T½ attention is distributed. The hierarchy window has width
  (1 − κ) ln ρ / ln(N − 2). It narrows as the source becomes less persistent and is gone under a random source.
- **κ = 0 never over-bets,** because nothing locks in.

The note's schematic has the right topology. Both of its boundaries are analytic: T = κ (commitment through
self-reinforcement) and T½ (the source's advantage ρ against the number of alternatives).

## E7: the update interval as a sampling window

**Question:** the thesis code can sum distances from k seeded sources before each update (`update_interval`, k = 1 in
every thesis result). Is that a sampling window like Lee et al.'s τ_c, with an optimum that grows with source
persistence?

**Setup:** noisy seeding as in E1 (ν = 0.5, Markov true source with mean dwell τ_E), clean mode, N = 30, tempered
selection T = 0.3, κ = 0. The thesis increment ε = 1 keeps memory short, so the window does the averaging. Windows
k = 1 to 64, 3 seeds. Fitness is log-loss on the true source. Script: `python -m nichenet.experiments.e7
[distances|rewards]`. Data: `data/site/e7.json`, `data/site/e7_rewards.json`.

| τ_E | 10 | 30 | 100 | 300 | 1000 | slope |
|---|---|---|---|---|---|---|
| k*, thesis rule (sum distances) | 1 | 1 | 1 | 1 | 1 | none (k = 1 always best) |
| k*, average rewards | 1 | 1.6 | 2.7 | 4.1 | 7.1 | 0.42 (local 0.39–0.46) |

- **The thesis rule never helps.** The true source's advantage is the ρ contrast from the source substitution, which
  appears only in steps where it is seeded. Summing distances over noisy seeds dilutes that contrast, and updating
  every k steps also stretches the memory k-fold.
- **Averaging rewards works as a sampling window.** It has an interior optimum that grows as τ_E^{0.42}, close to Lee
  et al.'s ½, and it lowers the achievable log-loss (1.43 against 1.59 at k = 1 for τ_E = 1000). To act as Lee's τ_c, a
  window has to average what the agent bets on, not the raw distances.

## E2: the tempered crossover across network sizes

**Prediction (note §8):** with a softmax instead of the φ cut, the transition on complete graphs is a smooth crossover
near T ∼ 1/ln N.

**Setup:** clean SS, complete graphs N = 16 to 256, constant source, tempered selection over 16 temperatures,
κ ∈ {0, 0.3}, ε = 1, 1500 steps, 2 seeds, GPU. Script: `python -m nichenet.experiments.e2`. Data:
`data/site/e2.json`.

**Results:**

- **Exact agreement.** Final source attention equals the B5 closed form x* = u*/(u* + N − 2), u* = ρ^{1/T_eff}, to
  machine precision (largest deviation 8·10⁻¹⁶ over 320 runs). The agreement is exact rather than a large-δ
  approximation: on a complete graph with a constant source the network settles into the symmetric state, where all
  relays are equivalent and the RWED takes the same value for every relay at any δ.
- **The crossover is smooth, and its centre collapses.** In z = T_eff ln(N − 2)/ln ρ, with T_eff = (T − κ)/(1 − κ),
  attention crosses ½ at z = 1.00–1.02 for every N. The prediction T ∼ 1/ln N holds in the exact form
  T_eff = ln ρ / ln(N − 2).
