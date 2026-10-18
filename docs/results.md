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

## E3: paying nodes for in-attention

**Question (note §8, Lee et al.'s monopoly prediction):** if being attended to pays, do hubs entrench by keeping their
followers' signal stable, and do challengers win only by destabilizing?

**Setup:** clean SS, complete graph N = 30, tempered selection T = 0.6, ε = 1, Markov source with τ_E = 200 or 2000.
Each node has its own κ_i in [0, 0.55], below T, so it never locks in. κ_i is its relay reliability: how stably it
keeps its attention, including its attention to the source.

- **Payoff per 200-step epoch:** a·(relay in-attention received, counted only when the node is not the source) minus
  its distance from the source. a = 0 is the control.
- **Selection:** after each epoch the lowest-payoff node copies the best node's κ, plus N(0, 0.05) noise.
- **Runs:** 150 epochs, 4 seeds. Script: `python -m nichenet.experiments.e3`. Data: `data/site/e3.json`.

| τ_E | a | mean κ, start → end | hub tenure (epochs) | takeovers by a less reliable node |
|---|---|---|---|---|
| 200 | 0 / 0.5 / 1 / 2 | 0.31 → 0.54 in all four | 1.2 | 41–46% |
| 2000 | 0 / 0.5 / 1 / 2 | 0.31 → 0.55 in all four | 2.3, 2.2, 1.8, 1.8 | 19%, 18%, 12%, 8% |

- **Paying for attention changes nothing.** κ rises to the cap at every payment level, including a = 0. A node that
  attends to the source stably holds a larger share of the attention paid to it, which shortens its own distance, so
  reliability is favoured for private reasons.
- **Hubs do not entrench.** The node with the most relay attention changes every one or two epochs, following the
  source's recent history. Payment does not lengthen tenure.
- **The monopoly mechanism has nothing to act on.** In Lee et al. a stabilizer changes the environment's switching rate,
  so a benefit can be captured or shared. In the SS model the source is exogenous: a node's κ shapes only its own
  attention and never feeds back on the source, and being attended to is a by-product of attending to the source. A
  transposition that tests the prediction would need nodes to influence where information appears, for example by
  letting the next source be drawn in proportion to attention received.
- **Caveat:** κ reaches the cap of 0.55 (kept below T to avoid lock-in), so the late-epoch trait spread is small. That
  makes the takeover measure uninformative at the end of the run.

**Two follow-ups.** Both stay null: a = 0 to 2 makes no difference in any of them.

| variant | τ_E = 200: hub tenure / mean κ at end | τ_E = 2000: hub tenure / mean κ at end |
|---|---|---|
| complete graph, source drawn by attention (E3b) | 1.3–1.4 / 0.54 | 1.9–2.1 / 0.55 |
| sparse graph (k = 4), exogenous source | 1.6 / 0.26–0.29 | 8.1–8.4 / 0.26–0.28 |
| sparse graph, source drawn by attention | 1.6–1.7 / 0.28–0.29 | 8.7–9.4 / 0.26–0.29 |

- **Endogenous source (E3b).** The new source is drawn in proportion to the relay attention each node receives, so
  attention buys future source status. On complete graphs the outcome is the same as E3.
- **Sparse graphs.** Here relays matter, and relay hubs do persist much longer (8–9 epochs at τ_E = 2000). But payment
  still does not lengthen tenure, κ no longer rises, and takeovers by a less reliable node run at chance (≈ 50%).
- **Conclusion.** The monopoly prediction has no purchase in the SS model as it stands, even when attention feeds back
  on where information appears. Data: `data/site/e3_endogenous.json`, `e3_sparse.json`, `e3_endogenous_sparse.json`.

## E4: closing the loop between memory and environmental pace

**Question (note §3.9, §8):** if a population's own memory sets how fast its environment switches, does the optimal
memory settle at a fixed point of τ_m* ≃ c τ_E(τ_m*)^{1/2}, cycle, or drift?

**Setup:** Lee et al.'s binary model (h₀ = 0.2, τ_c = 1000, v = 0.1, |α| = 0.95) with the mean-field population ABS,
for passive agents (control), stabilizers and destabilizers, at baseline τ_E = 100 and 1000.

1. **Residents:** for each of 12 memories τ_m from 0.3 to 60, a pure resident population gives the effective
   switching time τ_eff(τ_m), measured from the flip count.
2. **Best response:** a rare invader of the same type (fraction 0.01) best-responds over the same grid, paired against
   the residents over 2 seeds of 10⁷ steps. BR(τ_m) is the memory with the lowest invader-minus-resident divergence.
3. **Iteration:** the map τ_m → BR(τ_m) is iterated from both ends of the grid.

Script: `python -m nichenet.experiments.e4`. Data: `data/site/e4.json`.

| type, τ_E | τ_eff range over residents | fixed point τ_m^ (BR slope) | τ_eff at τ_m^ | passive τ_m* at that τ_eff (V-NL1) | pure-population optimum |
|---|---|---|---|---|---|
| passive, 100 | 100 | 0.70 (0) | 100 | 0.61–0.93 | 0.79 |
| passive, 1000 | 1004 | 2.50 (0) | 1004 | 2.3–3.7 | 2.06 |
| stabilizer, 100 | 812–1631 | 3.12 (+0.12) | 1482 | 3.10 | 3.33 |
| stabilizer, 1000 | 8196–18831 | 10.73 (+0.05) | 18194 | 10.80 | 14.1 |
| destabilizer, 100 | 53–69 | 0.55 (0) | 53 | 0.65 | 0.79 |
| destabilizer, 1000 | 519–550 | 1.77 (−0.01) | 521 | 1.86 | 2.06 |

- **A stable fixed point in every case.** Iterating the best response converges from both ends of the grid to the
  same τ_m^, with |BR slope| ≤ 0.12: no cycles and no drift.
- **The note's self-consistency relation holds.** At the fixed point, the memory equals a passive agent's optimum for
  the environment the population creates: within 1% for stabilizers and 5–15% for destabilizers. Lee et al.'s scaling
  therefore closes on itself, τ_m^ = c τ_eff(τ_m^)^{1/2} with the passive c.
- **Stabilizers slow their environment 15–18-fold** and settle at memories several times longer than passive agents.
  Destabilizers halve τ_eff and settle at shorter memories.
- **A tragedy of the commons.** The stable memory is shorter than the memory that minimizes the residents' own
  divergence (10.7 against about 14 at τ_E = 1000). Shorter-memory invaders free-ride on the slowdown the residents
  provide, which is Lee et al.'s argument about shared stabilization, now as a quantitative fixed point.

## E8 and A1–A4: the price of coordination

Interactive version with 3D paths, charts, per-section keys and the derivations:
[Coordination](/results/coordination/).

### Paths in the hierarchy morphospace

`python -m nichenet.experiments.paths` assembles seed-averaged corrected (T, F, O) along each experimental variable
from existing data: [V-SS](/results/source-structure/) φ, [E5](/results/e5/) T, [E6](/results/e6/) p and E8 (T, ν, N
and time). Data: `data/site/paths.json`.

- **Temperature is a one-dimensional descent** from the hierarchy corner down the diagonal to about (0.25, 0.25, 0.25)
  past T½.
- **The morphospace cannot tell hierarchy from over-betting.** A stale hub is as tree-like as a hub on the source; read
  position together with tracking.
- **Under a moving source, structure is kept by a per-node budget with κ > 0** (E6 distance cells stay at about
  (0.7–0.88, 0.8, 0.93–0.96)). The φ cut imposes structure whatever the signal (V-SS).
- **Noise erodes feedforwardness first.** In E8 the hub survives (T = 0.88), but peers rewire into cycles
  (F 0.88 → 0.57–0.78).

### E8: cost of coordination against niche size under a noisy signal

**Setup:** clean SS, complete graphs N ∈ {10, 20, 40, 80}, tempered selection T ∈ {0.15, …, 0.8}, κ = 0.2, ε = 1, Markov
source (τ_E = 300) seen through noisy seeding ν ∈ {0, 0.25, 0.5, 0.75} as in E1. 3000 steps, 10 snapshots, 2 seeds,
GPU. Benefit is ln(N − 1) − log-loss (E1). Cost is broadcast dissipation relative to the uniform network (as in E6).
Script: `python -m nichenet.experiments.e8`. Data: `data/site/e8.json`.

| N | benefit / ln(N−1), ν = 0 / 0.5 / 0.75 | cost, ν = 0 / 0.75 | benefit per cost, ν = 0 / 0.75 |
|---|---|---|---|
| 10 | 0.99 / 0.94 / 0.67 | 1.79 / 1.47 | 1.21 / 1.00 |
| 20 | 0.98 / 0.95 / 0.69 | 1.88 / 1.69 | 1.54 / 1.20 |
| 40 | 0.99 / 0.98 / 0.74 | 1.92 / 1.42 | 1.90 / 1.91 |
| 80 | 0.98 / 0.96 / 0.75 | 1.91 / 1.42 | 2.26 / 2.30 |

- **A hub costs about 2× the uniform network, almost independent of N.** Benefit grows as ln(N − 1), so nats per unit
  cost nearly double from N = 10 to 80.
- **Noise does not raise the cost; it lowers what is bought.** Up to ν = 0.5 at most 6% of the benefit is lost. At
  ν = 0.75 a quarter to a third is lost and the cost drops with commitment.
- **Noise is paid for in commitment.** The best T moves from 0.30 to 0.25, toward κ. This is the attention counterpart
  of the longer memory noise selects in E1.
- **Below T = κ the full price buys nothing:** stale hubs cost 1.9–2.0 at every ν (over-betting, E5).
- The thesis's all-to-all RWED cost is non-monotone in ν (2.4, 6.0, 1.9, 0.1 at N = 10), for the reason given in E1.

### Variation below T½ by signal

| N | T½ closed form | effective T½ at ν = 0.25 / 0.5 / 0.75 (E8) | relay-aware walk (A4) |
|---|---|---|---|
| 10 | 0.568 | 0.494 / 0.389 / 0.274 | 0.477 / 0.367 / – |
| 20 | 0.464 | 0.409 / 0.337 / 0.251 | 0.403 / 0.325 / – |
| 40 | 0.410 | 0.374 / 0.313 / < 0.25 | 0.363 / 0.305 / 0.225 |
| 80 | 0.375 | 0.339 / 0.294 / < 0.25 | 0.338 / 0.291 / 0.234 |

- **The window splits.** Just above κ there is a noise-robust band. At T = 0.25, tracking stays at 0.91–0.99 up to
  ν = 0.5 for every N. Strong reinforcement filters false seeds, and the true hub is the best relay for them (A4).
  Toward T½ is a noise-sensitive band, where tracking follows the noisy mean field and the effective T½ falls.
- **Noise removes a similar fraction of the window at every N:** about 20% at ν = 0.25, half at 0.5 and 80% at 0.75.
  Since the window already narrows as 1/ln N ([E2](#e2-the-tempered-crossover-across-network-sizes)), a large noisy
  niche needs a precisely tuned commitment. At N = 80 and ν = 0.5, T must lie within about 0.09 of κ.
- **Below κ the signal does not matter:** lock-in is set by the initial weights (A3).

### A1–A4: finer analysis of the tempered SS map

Code: `nichenet/continuum/analysis.py`. Tests: `py/tests/test_analysis.py`. Numbers:
`python -m nichenet.experiments.analysis` (`data/site/analysis.json`).

<details>
<summary><b>A1</b> · the symmetric reduction of B5 is exact at every δ</summary>

In the symmetric state the source's column is uniform, so every relay is equivalent under permutations fixing s. D_sk
is then the same for all k at any δ, and the common factor D^{κ−1} cancels in the reward ratio. The closed forms u*,
x* and T½ hold exactly; large δ is needed only off the symmetric state. Check: the simulated fixed point equals x* to
10⁻⁹ at δ = 1 and δ = 10.

</details>

<details>
<summary><b>A2</b> · linear stability through the kink: the spectral radius crosses 1 at T = κ</summary>

min_k D_k / ρ puts a kink at the symmetric fixed point (all relays tie). Linearize one smooth piece, anchored at one
relay, in the tangent space of the per-node budgets (N(N − 2) modes). At N = 10 and κ = 0.3, 72 of 80 modes sit at the
bulk rate (1 + εκ/T)/(1 + ε). A relay group sits 0.01–4% above it, so the spectral radius crosses 1 at T = κ, as in the
reduced map. An unanchored finite-difference Jacobian mixes the pieces and gives a spurious 0.75.

</details>

<details>
<summary><b>A3</b> · separatrix below T = κ: lock-in iff w_q / w_s > ρ^{(1−κ)/(κ−T)} initially</summary>

For source s and strongest peer q in a column, l = ln(w_s/w_q) has the fixed point l* = (1 − κ) ln ρ / (T − κ), which is
unstable for T < κ. Node-level agreement with simulation is 95–100% (κ = 0.4, 0.6, 0.8; tempered and hard cut).
Slightly fewer nodes lock in than predicted, because columns interact through the relay distances. As T → 0 this
recovers the one-step φ = 1 criterion (w_q/w_s)^κ > ρ^{1−κ}.

</details>

<details>
<summary><b>A4</b> · noisy mean field, fluctuations and the relay effect</summary>

E[r](x) = (1 − ν + ν/N) f(x) + ν (N − 1)/N g(x), where f is the reward with the true source seeded and g the reward
when a peer is seeded. Three levels of description:

1. The averaged map matches E8 within 3% for T ≥ 0.45.
2. Near κ the stochastic walk adds the Jensen gain from step-to-step fluctuations.
3. The relay-aware walk adds that the true source is the closest relay to a noise seed.

At T = 0.25, ν = 0.5 the three levels give 0.65 / 0.69 / 0.80 at N = 80, against 0.91 in E8, and 0.62 / 0.67 / 0.69
at N = 10, against 0.93. **Open:** the rest of the gap is attributed to peer heterogeneity, frequently seeded peers
becoming cyclic sub-hubs, which is the F drop. A two-class reduction would test this.

</details>
