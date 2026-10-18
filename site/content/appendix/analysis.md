---
title: A1–A4 · Analysis
result: The one-variable reduction behind the regime boundaries is exact at any walk cost (A1), it gives the linear stability of the full network despite a kink at the fixed point (A2), lock-in below κ follows a separatrix in the starting attention (A3), and the robustness of tracking to noise near κ comes from unequal rivals and relays (A4, tested).
implication: The regimes, their boundaries and the noise robustness are understood, not just observed, so they can be predicted for parameters not simulated.
chapter: /robustness/
chapterLabel: Chapter 5 · Why the hub survives noise
---
<!-- fold: Notation, code and data -->
The symbols are those of the [bridges](/appendix/bridges/): attention $A_{ki}$ (listener $i$ to agent $k$), shares
$P$, effective distances $D_k$ from the news, scores $S_{ki} = D_k^{\kappa-1}A_{ki}^{\kappa}$, tempered rewards
$R_{ki} \propto S_{ki}^{1/T}$, and the blend $A' = (A + \varepsilon R)/(1+\varepsilon)$. The symmetric state is the
one of B5: every listener gives $x$ to the source and $p = (1-x)/(N-2)$ to each other agent, and $u = x/p$.

Code: `nichenet/continuum/analysis.py`. Tests: `py/tests/test_analysis.py`. Numbers:
`python -m nichenet.experiments.analysis` (`data/site/analysis.json`), `python -m nichenet.experiments.a4_test`
(`data/site/a4_test.json`).

<!-- fold: A1 · The symmetric reduction is exact at every δ -->
**Claim.** In the symmetric state every relay is at the same effective distance from the source at any walk cost
$\delta$, not only at large $\delta$. The closed forms of B5 ($u^*$, $x^*$, the contraction rate and $T_{1/2}$) are
therefore exact there.

<!-- step: Name the symmetry -->
Let $\sigma$ be any relabelling of the agents that leaves the source in place, $\sigma(s) = s$. In the symmetric state
the listeners all look alike and the source treats them alike, so

$$A_{\sigma(k)\sigma(i)} = A_{ki} \quad\text{for all } k, i.$$

<!-- step: The shares and the walk inherit it -->
Row sums are relabelled along with the entries, so (1) gives $P_{\sigma(k)\sigma(j)} = P_{kj}$. Every power of $P$
inherits this, and so does

$$Z = \sum_{n\ge0} e^{-n\delta}P^{n}: \qquad Z_{\sigma(k)\sigma(j)} = Z_{kj}.$$

<!-- step: Every relay gets the same distance -->
Any relay $k$ can be sent to any other relay $k'$ by some $\sigma$ that fixes $s$. Then $Z_{sk} = Z_{sk'}$ and
$Z_{kk} = Z_{k'k'}$, so

$$D_k = -\ln\frac{Z_{sk}}{Z_{kk}} = D \quad\text{for every } k \ne s,$$

at any $\delta$, with no expansion.

<!-- step: The source's own distance follows -->
$D_s = \min_k D_k/\rho = D/\rho$.

<!-- step: B5 goes through unchanged -->
B5's steps 3–9 use only that all relays share one distance $D$ and that the source's is $D/\rho$. $D$ cancels in the
reward ratio, so its value never enters $u^*$, $x^*$, the slope or $T_{1/2}$.

<!-- step: What large δ is still needed for -->
Off the symmetric state the relays differ, and the clean form $D \approx \delta - \ln P$ (B5, step 10) is what keeps
those cases tractable.
<!-- /steps -->

**Check.** The simulated fixed point equals $x^*$ to $10^{-9}$ at $\delta = 1$ and $\delta = 10$.

<!-- fold: A2 · Stability through the kink -->
**Claim.** The full network, linearized at the symmetric fixed point, contracts at the rate of the reduced map in
almost every direction, and its spectral radius crosses 1 at $T = \kappa$. This holds despite the update having a
kink exactly at that point.

<!-- step: Locate the kink -->
The source's own distance is $D_s = \min_k D_k/\rho$. At the symmetric fixed point all $N-1$ relay distances tie
(A1), so the minimum switches which relay attains it. The update is continuous there but not differentiable, like
$|x|$ at 0, and a single Jacobian does not exist.

<!-- step: Split the map into smooth pieces -->
Near the fixed point the update equals one of $N-1$ smooth maps; piece $k^*$ uses $D_s = D_{k^*}/\rho$ for a fixed
relay $k^*$. By the symmetry of A1 all pieces have the same eigenvalues, so it is enough to linearize the piece
anchored at relay 1.

<!-- step: Count the directions -->
Each of the $N$ columns has $N-1$ entries that sum to 1, so it has $N-2$ free directions. The tangent space has
$N(N-2)$ directions: 80 at $N = 10$.

<!-- step: With distances frozen, every direction contracts at the bulk rate -->
Hold $D$ fixed. In one column the reward is $R_k = c_k A_k^{\kappa/T} / \sum_j c_j A_j^{\kappa/T}$ with
$c_k = D_k^{(\kappa-1)/T}$. Differentiating,

$$dR_k = R_k\Bigl[\frac{\kappa}{T}\frac{dA_k}{A_k} - \sum_j R_j\,\frac{\kappa}{T}\frac{dA_j}{A_j}\Bigr].$$

At a fixed point $R = A$, so

$$dR_k = \frac{\kappa}{T}\Bigl(dA_k - A_k\sum_j dA_j\Bigr) = \frac{\kappa}{T}\,dA_k,$$

because $\sum_j dA_j = 0$ on the budget. The reward map is $\kappa/T$ times the identity, and by B2 the round contracts
at

$$\lambda_{\text{bulk}} = \frac{1 + \varepsilon\kappa/T}{1+\varepsilon}.$$

<!-- step: Distances add a small correction in a few directions -->
Directions that change the shares $P$ also change the distances, and through $D_k^{\kappa-1}$ they shift the rewards.
At large $\delta$, $D \approx \delta - \ln P$, so $d\ln D = -(dP/P)/D$: the effect is suppressed by $1/D \approx 1/12$
at $\delta = 10$. Computed at $N = 10$, $\kappa = 0.3$: 72 of the 80 directions sit exactly at the bulk rate. The other
8 form a relay group 0.01–4% above it.

| $T$ | $x^*$ | bulk rate | spectral radius |
|---|---|---|---|
| 0.10 | 0.004 | 2.000 | 2.036 |
| 0.20 | 0.000 | 1.250 | 1.268 |
| 0.25 | 0.000 | 1.100 | 1.146 |
| 0.40 | 0.990 | 0.875 | 0.875 |
| 0.60 | 0.538 | 0.750 | 0.753 |
| 1.00 | 0.245 | 0.650 | 0.653 |

<!-- step: The spectral radius crosses 1 at T = κ -->
The bulk rate equals 1 at $T = \kappa$. The relay excess shrinks as $T$ comes down to $\kappa$ from above (0.01% at
$T = 0.4$, where $x^* = 0.99$), so the spectral radius crosses 1 at $T = \kappa$, as in the reduced map of B5. Below
$\kappa$ the symmetric state is already unstable in the bulk.

<!-- step: Avoid the trap of differencing across the kink -->
A finite-difference Jacobian taken across the kink mixes the pieces and produces a spurious eigenvalue (0.75 at
$N = 10$, $\kappa = 0.3$, $T = 0.6$). The anchored piece avoids this.
<!-- /steps -->

<!-- fold: A3 · Lock-in follows a separatrix -->
**Claim.** Below $T = \kappa$ a listener locks onto its strongest rival $q$ instead of the source $s$ exactly when it
starts with $w_q/w_s > \rho^{(1-\kappa)/(\kappa-T)}$. As $T \to 0$ this becomes the hard-selection criterion
$(w_q/w_s)^{\kappa} > \rho^{1-\kappa}$.

<!-- step: Follow the two entries that matter -->
In one listener's column, let $w_s$ be the attention on the source and $w_q$ that on the strongest rival. Below
$\kappa$ the contest is between these two.

<!-- step: Their reward ratio does not depend on the other entries -->
By (4), $R_s/R_q = (S_s/S_q)^{1/T}$: the column normalizer cancels. Take the rival at the common relay distance,
$D_q = D$, and the source at $D_s = D/\rho$:

$$\frac{R_s}{R_q} = \Bigl(\rho^{1-\kappa}\Bigl(\frac{w_s}{w_q}\Bigr)^{\kappa}\Bigr)^{1/T}.$$

With $l = \ln(w_s/w_q)$ the log reward ratio is

$$L(l) = \frac{1-\kappa}{T}\ln\rho + \frac{\kappa}{T}\,l.$$

Taking $D_q = D$ ignores how the other columns move the distances. That is why agreement below is 95–100% and not
exact.

<!-- step: The blend moves l toward L(l) -->
After (5),

$$\frac{w_s'}{w_q'} = \frac{w_s + \varepsilon R_s}{w_q + \varepsilon R_q},$$

a weighted mediant of $w_s/w_q$ and $R_s/R_q$, which always lies between the two. So $l$ rises when $L(l) > l$ and
falls when $L(l) < l$.

<!-- step: Find the fixed point and the sign of the drift -->
$L(l^*) = l^*$ gives

$$l^* = \frac{(1-\kappa)\ln\rho}{T-\kappa}, \qquad L(l) - l = \frac{\kappa - T}{T}\,(l - l^*).$$

<!-- step: Above κ the point attracts; below κ it divides two outcomes -->
For $T > \kappa$ the factor $(\kappa-T)/T$ is negative and $l \to l^*$; then $e^{l^*}$ is B5's $u^*$. For $T < \kappa$
it is positive and $l$ runs away from $l^*$: starting above, the source takes the column; starting below, the rival
does. $l^*$ is a separatrix.

<!-- step: Turn it into a starting condition -->
For $T < \kappa$, $l^* < 0$. Lock-in happens when $l_0 < l^*$, i.e. $\ln(w_q/w_s) > (1-\kappa)\ln\rho/(\kappa-T)$:

$$\frac{w_q}{w_s} > \rho^{(1-\kappa)/(\kappa-T)}.$$

The rival must start ahead by more than this factor to overcome the source's advantage $\rho$.

<!-- step: Take the hard-selection limit -->
As $T \to 0$ the exponent tends to $(1-\kappa)/\kappa$, so the condition becomes $(w_q/w_s)^{\kappa} > \rho^{1-\kappa}$,
which is $S_q > S_s$. With $T \to 0$ the top score takes all the reward, so whoever scores higher in the first round
wins it and keeps winning.
<!-- /steps -->

**Check.** $N = 20$, 600 rounds; share of listeners locked onto a rival, predicted against observed:

| $\kappa$ | selection | $T$ | threshold $w_q/w_s$ | predicted | observed | agreement |
|---|---|---|---|---|---|---|
| 0.4 | tempered | 0.1 | 6.76 | 0.16 | 0.12 | 96% |
| 0.4 | tempered | 0.2 | 17.6 | 0.09 | 0.09 | 100% |
| 0.4 | cut | 0 | 4.19 | 0.25 | 0.25 | 100% |
| 0.6 | tempered | 0.15 | 2.34 | 0.46 | 0.40 | 95% |
| 0.6 | tempered | 0.3 | 3.58 | 0.25 | 0.25 | 100% |
| 0.6 | cut | 0 | 1.89 | 0.53 | 0.51 | 98% |
| 0.8 | tempered | 0.2 | 1.38 | 0.70 | 0.67 | 96% |
| 0.8 | tempered | 0.6 | 2.60 | 0.39 | 0.39 | 100% |
| 0.8 | cut | 0 | 1.27 | 0.77 | 0.75 | 98% |

Slightly fewer listeners lock in than predicted, because columns interact through relay distances.

<!-- fold: A4 · Noise: mean field, fluctuations, relays and unequal rivals -->
**Claim.** Under false alarms, the symmetric reduction explains tracking well above $T \approx 0.45$. Near $\kappa$
it falls short, and the gap is closed by three effects in turn: fluctuations, relays, and unequal rivals. The last is
tested by switching it off in the simulation.

<!-- step: Count where the news lands -->
With probability $1-\nu$ the news starts at the true source; otherwise at a uniformly random agent, which may be the
source. So the source is seeded with probability $1 - \nu + \nu/N$, and each of the other $N-1$ agents with
probability $\nu/N$.

<!-- step: Reward when the true source is seeded -->
This is B5: $f(x) = a/(a + (N-2)b)$ with $a = (\rho^{1-\kappa}x^{\kappa})^{1/T}$ and $b = (p^{\kappa})^{1/T}$.

<!-- step: Reward when a rival is seeded -->
If agent $j$ is seeded, $j$ gets the advantage: its distance is $D/\rho$, while the source and the rest are at $D$
(ignoring relays for now). A listener's scores are $j$: $(D/\rho)^{\kappa-1}p^{\kappa}$; source:
$D^{\kappa-1}x^{\kappa}$; the other $N-3$: $D^{\kappa-1}p^{\kappa}$. Dividing by $D^{\kappa-1}$ and tempering, the
source's reward is

$$g(x) = \frac{c}{\rho^{(1-\kappa)/T}\,b + c + (N-3)\,b}, \qquad c = x^{\kappa/T}.$$

<!-- step: Level 1: average the reward -->
$$\mathbb{E}[r](x) = \Bigl(1 - \nu + \frac{\nu}{N}\Bigr) f(x) + \nu\,\frac{N-1}{N}\, g(x).$$

The averaged map $x \mapsto (x + \varepsilon\,\mathbb{E}[r])/(1+\varepsilon)$ has fixed points $x = \mathbb{E}[r](x)$.
It matches the simulations of [E8](/appendix/e8/) within 3% for $T \ge 0.45$, where one round differs little from
the next.

<!-- step: Level 2: keep the round-to-round fluctuations -->
Draw the seed afresh every round instead of averaging. Because the map is nonlinear, the time average of $x$ is not
the fixed point of the averaged map (Jensen's inequality). Near $\kappa$ the fluctuations raise it: at $N = 10$,
$\nu = 0.5$, $T = 0.25$, from 0.62 to 0.67.

<!-- step: Level 3: the true source is the closest relay to a false alarm -->
In a false-alarm round, distances are measured from $j$. $j$'s audience is the source, which gives it
$q = 1/(N-1)$, and the other agents, which give it $p$ each, so

$$P_{js} = \frac{q}{q + (N-2)p}, \qquad P_{jk} = \frac{p}{q + (N-2)p}.$$

When $x > 1/(N-1)$, $p < q$: the source is $j$'s largest listener, so $D_s = \delta - \ln P_{js}$ is the shortest relay
distance and $D_j = D_s/\rho$. Since $\kappa - 1 < 0$, the shorter distance raises the source's score, so it keeps more
reward even in rounds when the news is false. Tracking rises from 0.67 to 0.69 at $N = 10$ and from 0.69 to 0.80 at
$N = 80$ ($\nu = 0.5$, $T = 0.25$).

<!-- step: What is still missing -->
The three levels give 0.62 / 0.67 / 0.69 at $N = 10$ against 0.93 simulated, and 0.65 / 0.69 / 0.80 at $N = 80$
against 0.91. All of them keep the rivals equal.

<!-- step: Unequal rivals pull less, by concavity -->
For $T > \kappa$ the exponent $\alpha = \kappa/T$ is below 1, so a rival's pull $w^{\alpha}$ is concave in its weight.
By Jensen's inequality, for the $N-2$ rival weights with mean $\bar w$,

$$\sum_k w_k^{\alpha} \le (N-2)\,\bar w^{\alpha},$$

with equality only when they are equal. Uneven rivals have less total pull, so the source's share
$s/(s + \sum_k \text{pull}_k)$ is larger. The competition factor $\sum_k w_k^{\alpha}/((N-2)\bar w^{\alpha})$ measures
this. It is 0.87–0.94 at $T = 0.25$ and approaches 1 as $T$ grows.

<!-- step: Why false alarms make rivals unequal -->
Each false alarm boosts one random rival for a few rounds. The leftover attention therefore sits on a few recent
rivals, not evenly on all of them.
<!-- /steps -->

**Test.** A 2 × 2 factorial in the simulation: reward by position or by evidence (no relays; [E9](/appendix/e9/)),
crossed with rivals free or equalized after every round; against it, a column walk keeps one agent's full unequal
column.

- **With rivals equalized, each simulation matches its walk** within 0.03 at N ≥ 20 and 0.06 at N = 10.
- **Unequal rivals carry the whole excess near κ:** at N = 10, ν = 0.5, T = 0.25 tracking falls from 0.941 to 0.746
  when rivals are equalized; at N = 80 from 0.944 to 0.823. At T = 0.45 the change is within 0.01.
- **A single unequal column recovers 40–100% of the excess.**
- **Relays amplify it:** unequal rivals add 0.20 with relays and 0.09 without (N = 10, ν = 0.5).
- The drop in feedforwardness under noise and the robustness of tracking near κ are the same phenomenon: short-lived
  side hubs that reduce the competition the source faces.
