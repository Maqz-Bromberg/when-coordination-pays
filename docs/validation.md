# Validation status

Checks that must pass before experiments are reported (PLAN.md §3). Each line names its test or script.

| ID | Check | Status | Where |
|----|-------|--------|-------|
| V-SS0 | Faithful SS mode equals the thesis code step for step: 28 cases (κ, φ grid, sparse, uncoupled, all 8 directionality binaries, undirected, update interval, δ, ρ), matrices after every update and effective distances, rtol 1e-9 | pass | `py/tests/test_golden_reference.py` |
| — | Hierarchy coordinates (thesis variant) and efficiency coordinates equal the thesis code on 10 and 5 matrices | pass | same |
| — | Corominas-Murtra hierarchy coordinates: trees and stars give (1, 1, 1), inverted tree T = −1, cycle O = 0 | pass | `py/tests/test_hierarchy.py` |
| B1 | Reward step is w ← (w + ε r)/(1 + ε); thesis code has ε = 1 | pass | `test_ss_model.py`, `tools/legacy_oracle` |
| B5 | φ = 0, constant source: source attention ρ/(ρ + N − 2), contraction (1+κ)/2, in faithful and clean modes | pass | same |
| — | JAX kernel equals numpy clean mode (7 configs incl. tempered selection, sparse graphs) | pass | `test_jax_kernel.py` |
| V-NL0 | nichenet eigenfunction solver equals Lee et al.'s on 6 cases (passive, stabilizer, destabilizer; τ_E = 3–300; 5 values of β), rtol 1e-8 | pass | `py/tests/test_nl.py` |
| V-NL1 | Fig. 2c–d: τ_m* ∼ τ_E^{1/2}, D* ∼ τ_E^{−1/2} | pass, see below | `python -m nichenet.experiments.v_nl1` → `data/site/v_nl1.json` |
| V-NL2 | Fig. 4 invasion graph | not started | |
| V-SS1 | Constant source, complete graph: star at φ = 1 for low κ (source attention 1.00 at κ = 0, 0.97 at 0.2), resisted by κ (0.48 at 0.6, 0.04 at 0.95); global effective distance rises with specialization | pass, see below | `python -m nichenet.experiments.v_ss` → `data/site/v_ss.json` |
| V-SS2 | Sparse threshold φ > 1 − k/N exists in faithful mode and disappears in clean mode | pass (artifact confirmed) | same |
| V-SS3 | κ = 0.95, φ = 1: 98% of nodes keep their initially strongest in-edge | pass | same |
| V-SS4 | Smooth transition on complete graphs; observables scale with log N | not started | |
| V-TR1 | Linear-flux (Tero et al.) adaptation keeps the shortest of two routes and prunes the other | pass | `py/tests/test_transport.py` |
| V-TR2 | Fluctuations create loops: Corson σ = 3 loops rise monotonically with γ (0.25 → 0.9); Katifori moving sink is looped where the steady load gives a tree | pass | same |
| V-TR3 | Steady load: spanning trees for γ < 1 (several γ, seeds); γ > 1 keeps all edges | pass | same |
| — | Adaptation (Ronellenfitsch & Katifori eq. 4, c = 0) reaches the Corson optimum for g = 1/(1+γ); Kirchhoff conservation | pass | same |

## V-NL1 detail

Fit over 10 ≤ τ_E ≤ 10⁴ (13 values of τ_E from 1 to 10⁵, 40 Lobatto points in β, h₀ = 0.2, 1/τ_c = 10⁻³, v = 0.1,
|α| = 0.95):

| Agent | d ln τ_m*/d ln τ_E | d ln D*/d ln τ_E | local slopes at large τ_E |
|-------|-----|-----|-----|
| passive | 0.464 | −0.313 | τ_m*: 0.50, 0.50, 0.48; D*: −0.47, −0.48, −0.49 |
| stabilizer (α = −0.95) | 0.520 | −0.477 | τ_m*: 0.50 for τ_E = 10²–10⁴, then 0.62, 0.30, 0.14 |
| destabilizer (α = +0.95) | 0.442 | −0.266 | τ_m*: 0.50, 0.50, 0.51; D*: −0.45, −0.47, −0.48 |

- **The exponents approach ½ from below**, because small τ_E sits at the sensing-noise floor (D ≈ 1/(2τ_c)). Range-wide
  fits therefore understate the exponent. Report local slopes, or fit only τ_E ≥ 10³.
- **Stabilizers above τ_E ≈ 10⁴ are not reliable yet.** A matched stabilizer switches with probability
  (1 − 0.95)/τ_E, an effective time of about 2·10⁶ steps at τ_E = 10⁵. The iteration's stopping rule (per-step change
  below 10⁻⁵, at most 1500 steps) can then stop before the density is stationary. The reference code behaves the same
  way. To be checked with the agent-based simulation.

## Transport notes

- **The update rule is sourced.** The fixed point C_e ∝ ⟨I_e²⟩^{1/(1+γ)} is Corson (2010) eq. 6. It is also the stationarity
  condition of Katifori et al. (2010) eqs. 1–5. Hu & Cai (2013) is not on arXiv, so the adaptation rule is taken from
  Ronellenfitsch & Katifori (2016) eq. 4, which generalizes it. Its 2g = 1 case is the linear-flux Physarum rule.
- **Convergence is slow at moderate fluctuations.** For γ < 1 the iteration converges slowly as edges decay towards 0.
  At σ = 1 the loop counts were not monotone after 3000 iterations (3, 0, 0–19 loops for γ = 0.5, 0.75, 0.9). This
  needs more iterations or an acceleration before σ ≈ 1 results are reported. Tests use σ = 0 and σ = 3.

## V-SS detail

N = 60, 300 steps, 3 seeds, φ ∈ {0, 0.1, …, 1}, κ ∈ {0, 0.2, 0.4, 0.6, 0.8, 0.95}, faithful mode, plus clean mode on the
sparse graphs. 990 runs in 42 s on 14 cores.

- **Star formation.** Constant source, complete graph: at φ = 1, source attention is 1.00 (κ = 0), 0.97 (0.2),
  0.48 (0.6) and 0.04 (0.95).
- **Local gain, global cost.** The all-to-all effective distance rises by 4–13 for κ ≥ 0.2 and φ ≥ 0.5, matching the
  thesis Fig. 5.2. At κ = 0 it falls instead (−0.01 to −0.30). This is quirk Q1: at κ = 0 faithful mode rewires to a
  complete graph with self-loops.
- **Sparse threshold.** k = 6, κ = 0.2: in faithful mode source attention stays at 0.058 for φ ≤ 0.8 and moves only
  above φ = 0.9 = 1 − k/N. In clean mode it rises steadily from φ = 0.2 (0.061, 0.063, … 0.107).
- **Weighted hierarchy coordinates read the backbone, not the attention.** With linear thresholds, every κ = 0
  network gives T = F = O = 0.88, even at φ = 0 where the source holds only 4% of the attention. The top 7 of 8
  thresholds keep only the source's edges, which form a perfect star; the lowest threshold gives a complete graph
  scored 0. So high TFO does not by itself mean attention has condensed; report it alongside source attention.
- **Lock-in criterion (note §6.4).** The prediction is that an edge stronger than the source edge keeps winning if
  (w_max/w_s)^κ > ρ^{1−κ}. It gets the trend and the κ → 1 limit right but overestimates lock-in at intermediate κ:

  | κ | measured | predicted from the initial weights | with actual relay distances |
  |---|---|---|---|
  | 0.2 | 0.04 | 0.06 | 0.05 |
  | 0.4 | 0.17 | 0.27 | 0.26 |
  | 0.6 | 0.39 | 0.56 | 0.53 |
  | 0.8 | 0.73 | 0.86 | 0.85 |
  | 0.95 | 0.98 | 0.98 | 0.98 |

  The gap is not the spread of relay distances. It is the dynamics after the first step: as nodes desert the source,
  the source's out-row changes, and with it every relay's value. The criterion is a one-step bound.
