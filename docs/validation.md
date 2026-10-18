# Validation status

Checks that must pass before experiments are reported (PLAN.md §3). Each line names its test or script.

| ID | Check | Status | Where |
|----|-------|--------|-------|
| V-SS0 | Faithful SS mode equals the thesis code step for step: 28 cases (κ, φ grid, sparse, uncoupled, all 8 directionality binaries, undirected, update interval, δ, ρ), matrices after every update and effective distances, rtol 1e-9 | pass | `py/tests/test_golden_reference.py` |
| — | Hierarchy coordinates (thesis variant) and efficiency coordinates equal the thesis code on 10 and 5 matrices | pass | same |
| — | Corominas-Murtra hierarchy coordinates: trees and stars give (1, 1, 1), inverted tree T = −1, cycle O = 0 | pass | `py/tests/test_hierarchy.py` |
| B1 | Reward step is w ← (w + ε r)/(1 + ε); thesis code has ε = 1 | pass | `test_ss_model.py`, `tools/legacy_oracle` |
| B5 | φ = 0, constant source: source attention ρ/(ρ + N − 2), contraction (1+κ)/2, in faithful and clean modes | pass | same |
| B2 | The SS step W' = (W + εR)/(1+ε) is exactly a forward-Euler step of the logit flow dW/dt = R(W) − W with step ε/(1+ε) | pass (identity) | `test_continuum.py` |
| B3 | Tempered fixed points are softmax(−ln D / T_eff), T_eff = (T − κ)/(1 − κ); equal to a 600-step simulation to 1e-9; the Sato–Crutchfield replicator with r = −ln D, β = (1−κ)/T, α = 1 − κ/T vanishes there | pass | same |
| B5 | Symmetric large-δ closed forms: x* = u*/(u* + N − 2), u* = ρ^{(1−κ)/(T−κ)}; contraction (1 + εκ/T)/(1+ε); condensation for T < κ; T_½ = κ + (1−κ) ln ρ / ln(N−2) | pass | `test_large_delta.py` |
| — | Large-δ distances D = δ − ln T_sj track the full RWED (to 1e-3) under proportional reward, and fail under selective cuts, where weights fall below e^{−δ} and two-hop paths set the distance | pass (limit documented) | same |
| — | Pyodide (numpy 1.26) runs the nichenet wheel and matches CPython (numpy 2.5) to 4e-16 on an SS run and eigen D(β) | pass | `web/scripts/pyodide-smoke.mjs` |
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
| stabilizer (α = −0.95) | 0.520 | −0.477 | eigen: 0.50 for τ_E = 10²–10⁴, then 0.62, 0.30, 0.14 (unconverged); ABS: 0.49, 0.55, 0.48 up to 10⁵ |
| destabilizer (α = +0.95) | 0.442 | −0.266 | τ_m*: 0.50, 0.50, 0.51; D*: −0.45, −0.47, −0.48 |

- **The exponents approach ½ from below**, because small τ_E sits at the sensing-noise floor (D ≈ 1/(2τ_c)). Range-wide
  fits therefore understate the exponent. Report local slopes, or fit only τ_E ≥ 10³.
- **Stabilizers above τ_E ≈ 10⁴: the eigen method stops early; the scaling holds.** A matched stabilizer switches with
  probability (1 − 0.95)/τ_E, an effective time of about 2·10⁶ steps at τ_E = 10⁵. The eigen iteration's stopping
  rule (per-step change below 10⁻⁵, at most 1500 steps) then stops before the density is stationary, in the reference
  code as in nichenet. Agent-based simulation with run length 10⁴ τ_E (`python -m nichenet.experiments.v_nl1_abs`)
  gives τ_m* = 11.2, 34.2, 71.2, 113.1 at τ_E = 10³, 10⁴, 3.8·10⁴, 10⁵ (local slopes 0.49, 0.55, 0.48), against
  eigen values of 63.2 and 72.5 at the two largest τ_E. The τ_E^{1/2} law holds for stabilizers too; the flattening
  in the eigen results is numerical.
- **ABS and eigen agree** within 1% for passive agents and destabilizers at τ_E = 30 and 300, and within the sampling
  error for stabilizers (`test_abs_matches_eigen`).

## Transport notes

- **The update rule is sourced.** The fixed point C_e ∝ ⟨I_e²⟩^{1/(1+γ)} is Corson (2010) eq. 6. It is also the stationarity
  condition of Katifori et al. (2010) eqs. 1–5. Hu & Cai (2013) is not on arXiv, so the adaptation rule is taken from
  Ronellenfitsch & Katifori (2016) eq. 4, which generalizes it. Its 2g = 1 case is the linear-flux Physarum rule.
- **Converged runs at moderate fluctuations are monotone.** At σ = 1 on an 8 × 8 lattice, four seeds give 3, then
  10–12, then 18–20 loops for γ = 0.5, 0.75, 0.9 (up to 6000 iterations, tolerance 10⁻¹²). Earlier counts that
  were not monotone came from runs stopped before converging (3000 iterations, tolerance 10⁻⁹). The defaults are now
  30000 iterations and 10⁻¹². For γ < 1 the local minimum depends on the starting conductances, as Corson notes, which
  accounts for the seed-to-seed spread of about ±1 loop.
