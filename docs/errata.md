# Errata and implementation notes for the 2020 thesis code

Each entry is reproduced by a test. "Faithful" results in nichenet keep these behaviours, and new results use
the corrected behaviour unless stated.

## Errors

### H1. Hierarchy coordinates: element-wise instead of matrix powers in the graph entropies

**Where:** `reference/Networks_Via_Diffusion/hierarchy_coordinates.py`, `graph_entropy`:
`P = sum([np.power(B.T, k) for k in range(len(dag))])`. The standalone `Hierarchy_Coordinates` repo
keeps `np.power`. It changes the range to k = 1 … L(G_C), the forward normalization to rows and the log base,
but those changes do not remove the error.

**Definition:** Corominas-Murtra et al. (2013), appendix D of arXiv:1303.2503 (eq. 14 of the PNAS SI). The
probability of crossing v_j on a walk from v_i is a sum of **matrix** powers, P = Σ_k (Bᵀ)ᵏ backwards with
B_ij = A_ij / k_in(v_j), and P = Σ_k B′ᵏ forwards with B′_ij = A_ij / k_out(v_i). The entropies are

- H_b = 1/|µ| Σ_{i∈µ} Σ_{k∉M} P(k ← i) ln k_in(k)
- H_f = 1/|M| Σ_{i∈M} Σ_{k∉µ} P(i → k) ln k_out(k)

Here M is the set of maximal nodes and µ the set of minimal nodes.

**What the code computes instead:** `np.power` raises each entry to the power k, and its k = 0 term is the all-ones
matrix (0⁰ = 1). Every pair therefore gets weight ≥ 1, and the entropies reduce to H_b = Σ_{k∉M} ln k_in(k) and
H_f = Σ_{k∉µ} ln k_out(k). These are plain sums of log-degrees, with no weighting by whether a walk from the boundary
reaches the node. `py/tests/test_hierarchy_thesis.py` has two four- and six-node examples where this doubles H_b.

**Note on the paper:** the paper prints the sums from k = 1. Read literally, a single fork a → {b, c} would have
H_f = 0, and a directed tree would have T = 0, which contradicts the paper's Lemma (T = F = O = 1 for trees with
equal-length leaves) and its Figs. 12–13. The [hierarchy-coordinates](https://github.com/Maqz-Bromberg/hierarchy-coordinates) package includes the k = 0 identity term.
The Lemma cases are tests in its `tests/test_coordinates.py`. nichenet pins its version 0.1.0, the last with the
thesis variant used here.

### H2. Hierarchy coordinates: treeness averages over the wrong set of subgraphs

**Where:** the same file, `treeness`. It averages f over the top-down and the bottom-up pruning sequences, and each
sequence starts with G. So G counts twice, and pruned subgraphs without links count as f = 0.

**Definition:** eq. D9. T = ⟨f⟩ over W(G), the set made of G once plus the pruned subgraphs that still contain at
least one link.

### Effect of H1 and H2 on evolved networks

180 faithful-mode SS networks: N = 30, 150 steps, φ ∈ {0, .25, .5, .75, .9, 1}, κ ∈ {0, .25, .5, .75, .95},
3 seeds, constant and random seeding. Data: `data/site/errata_hierarchy.json`; script:
`python -m nichenet.experiments.errata_hierarchy`.

| Thresholds, seeding | T thesis code | T with H1 fixed only | T Corominas-Murtra (H1 + H2) | mean / max \|Δ\| |
|---|---|---|---|---|
| linear, constant | 0.469 | 0.493 | 0.680 | 0.219 / 0.352 |
| linear, random   | 0.299 | 0.333 | 0.425 | 0.136 / 0.366 |
| exponential, constant | 0.246 | 0.271 | 0.350 | 0.112 / 0.433 |
| exponential, random   | 0.206 | 0.232 | 0.285 | 0.089 / 0.387 |

Mean treeness by selectivity, linear thresholds:

| φ | constant: thesis | constant: corrected | random: thesis | random: corrected |
|---|---|---|---|---|
| 0.00 | 0.383 | 0.575 | 0.172 | 0.258 |
| 0.25 | 0.467 | 0.700 | 0.231 | 0.344 |
| 0.50 | 0.454 | 0.696 | 0.211 | 0.328 |
| 0.75 | 0.453 | 0.704 | 0.215 | 0.320 |
| 0.90 | 0.453 | 0.714 | 0.385 | 0.631 |
| 1.00 | 0.605 | 0.694 | 0.580 | 0.669 |

- **Size and sign:** the thesis code underestimates treeness, by 0.1–0.25 on average. One network in 180 changes sign under each threshold scheme.
- **Which error dominates:** H1 alone accounts for 0.02–0.09 of the gap, growing with φ. H2 accounts for the rest.
- **Shape of the curve:** under constant seeding, corrected T is near 0.7 for every φ > 0. In the thesis code it is flat
  near 0.45 and jumps only at φ = 1. So the code understates how early structure becomes tree-like, and overstates the
  jump at φ = 1.
- **F and O:** unaffected.

## Implementation behaviours of the SS model

These are not errors against a published definition, but they change results. nichenet's faithful mode keeps them
and clean mode fixes them (`SSParams.clean`).

| ID | Behaviour | Effect | Test |
|----|-----------|--------|------|
| Q1 | κ = 0: `pow(0, 0) = 1` scores non-edges and self-loops | any graph becomes complete with self-loops; the κ = 0 column of the heat maps describes that model | `test_kappa_zero_rewires_only_in_faithful_mode` |
| Q2 | φ cut ranks all N entries, non-edges included | sparse graphs see no selection until φ > 1 − k/N | `test_rank_over_in_neighbours_removes_sparse_threshold` |
| Q3 | initialization normalizes rows; updates normalize columns | first update mixes conventions | `tools/legacy_oracle` |
| Q4 | reward per node sums to 1 (ε = 1) | memory fixed at β = ½; κ provides inertia, β_eff = (1+κ)/2 | `test_update_is_average_with_increment_epsilon` |
| Q5 | `constant_source_node=0` means random seeding | silent switch to random seeding for source 0 | `tools/legacy_oracle` |
| Q6 | `seed_info_random` uses an unseeded `default_rng()` | random-seeding runs cannot be reproduced | — |
| Q7 | "n shifts" changes source when t % int(T/n) == 0, including t = 0 | 10 shifts over 25 steps give 13 sources | `test_schedules` |

## Library changes since the thesis

- **networkx ≥ 3 `all_simple_paths(G, s, s)`** yields the trivial path `[s]`; networkx 2.x yields nothing. Nodes left
  isolated by pruning are both maximal and minimal, so under networkx 3 the unchanged thesis feedforwardness counts
  extra one-node paths. Example: F = 0.169 instead of 0.166 on `rand_w`. nichenet skips s = t.
