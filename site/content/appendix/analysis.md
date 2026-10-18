---
title: A1–A4 · Analysis
result: The one-variable reduction behind the regime boundaries is exact at any walk cost (A1), it gives the linear stability of the full network despite a kink at the fixed point (A2), lock-in below κ follows a separatrix in the starting attention (A3), and the robustness of tracking to noise near κ comes from unequal rivals and relays (A4, tested).
implication: The regimes, their boundaries and the noise robustness are understood, not just observed, so they can be predicted for parameters not simulated.
chapter: /robustness/
chapterLabel: Chapter 5 · Why the hub survives noise
---
Code: `nichenet/continuum/analysis.py`. Tests: `py/tests/test_analysis.py`. Numbers:
`python -m nichenet.experiments.analysis` (`data/site/analysis.json`), `python -m nichenet.experiments.a4_test`
(`data/site/a4_test.json`).

## A1 · The symmetric reduction is exact at every δ

In the symmetric state the source's own attention is spread evenly, so every relay is equivalent under the permutations
that fix the source. The effective distance D_sk is then the same for all k at any δ, and the common factor D^{κ−1}
cancels from the reward ratio, which is (ρ^{1−κ} u^κ)^{1/T} with u = x/p. The closed forms u*, x* and T½ hold exactly;
large δ is needed only off the symmetric state. Check: the simulated fixed point equals x* to 10⁻⁹ at δ = 1 and δ = 10.

## A2 · Stability through the kink

The source's own distance is the smallest relay distance divided by ρ, so at the symmetric fixed point, where all relays
tie, the update has a kink. Linearize one smooth piece, anchored at one relay, in the space of attention shifts
(N(N − 2) directions). At N = 10, κ = 0.3, 72 of 80 directions contract at exactly (1 + εκ/T)/(1 + ε); a relay group sits
0.01–4% above. The spectral radius crosses 1 at T = κ, as in the reduced map. A finite-difference Jacobian taken across
the kink mixes the pieces and gives a spurious 0.75.

## A3 · Lock-in follows a separatrix

For the source s and the strongest rival q in a listener's column, l = ln(w_s/w_q) has the fixed point
l* = (1 − κ) ln ρ / (T − κ), repelling for T < κ. A listener locks onto its rival iff initially
w_q / w_s > ρ^{(1−κ)/(κ−T)}. Agreement with simulation is 95–100% (κ = 0.4, 0.6, 0.8; tempered and hard selection);
slightly fewer listeners lock in than predicted, because columns interact through relay distances. As T → 0 this becomes
(w_q/w_s)^κ > ρ^{1−κ}, the criterion for hard selection.

## A4 · Noise: mean field, fluctuations, relays and unequal rivals

E[r](x) = (1 − ν + ν/N) f(x) + ν (N − 1)/N g(x), where f is the reward with the true source seeded and g the reward when
a rival is seeded. Three levels of description:

1. The averaged map matches E8 within 3% for T ≥ 0.45.
2. Near κ the stochastic walk adds the gain from round-to-round fluctuations (Jensen).
3. The relay-aware walk adds that the true source is the closest relay even to false news.

At T = 0.25, ν = 0.5 these give 0.65 / 0.69 / 0.80 at N = 80 against 0.91 simulated, and 0.62 / 0.67 / 0.69 at N = 10
against 0.93.

**Test.** A 2 × 2 factorial in the simulation: reward by position or by evidence (no relays; [E9](/appendix/e9/)),
crossed with rivals free or equalized after every round; against it, a column walk keeps one agent's full unequal column.

- **With rivals equalized, each simulation matches its walk** within 0.03 at N ≥ 20 and 0.06 at N = 10.
- **Unequal rivals carry the whole excess near κ:** at N = 10, ν = 0.5, T = 0.25 tracking falls from 0.941 to 0.746
  when rivals are equalized; at N = 80 from 0.944 to 0.823. At T = 0.45 the change is within 0.01.
- **Mechanism: concavity.** For T > κ a link's pull w^{κ/T} is concave; false alarms leave the leftover attention on a
  few recent rivals, and uneven weight has less total pull. The competition factor Σ w^{κ/T} / ((N − 2) w̄^{κ/T}) is
  0.87–0.94 at T = 0.25 and approaches 1 with T. A single unequal column recovers 40–100% of the excess.
- **Relays amplify it:** unequal rivals add 0.20 with relays and 0.09 without (N = 10, ν = 0.5).
- The drop in feedforwardness under noise and the robustness of tracking near κ are the same phenomenon: short-lived
  side hubs that reduce the competition the source faces.
