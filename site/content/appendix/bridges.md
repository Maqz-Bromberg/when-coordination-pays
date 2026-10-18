---
title: B1–B5 · Bridges
result: One update of the model is exactly a forward-Euler step of a logit flow, its fixed points are softmaxes of −ln D at an effective temperature (T − κ)/(1 − κ), and in the symmetric state the whole network reduces to one variable with closed-form fixed point, stability and T½.
implication: The regime boundaries, the size scaling and the noise analysis all rest on these reductions, and they connect the model to replicator dynamics with memory loss.
chapter: /regimes/#boundaries
chapterLabel: Chapter 3 · Three regimes
---
<!-- fold: Notation: one round in symbols -->
Every derivation on this page uses the same quantities. There are $N$ agents and the news starts at agent $s$ (the
source, or a false alarm).

| Symbol | Meaning |
|---|---|
| $A_{ki}$ | how much listener $i$ attends to agent $k$; each column sums to 1 and $A_{ii} = 0$ |
| $P_{kj}$ | the share of $k$'s audience that $j$ makes up; a walker at $k$ steps to $j$ with this probability |
| $D_k$ | the effective distance from the news at $s$ to agent $k$ |
| $S_{ki}$ | the score listener $i$ gives agent $k$ |
| $R_{ki}$ | the reward: the share of $i$'s new attention that goes to $k$ |
| $\kappa, T, \varepsilon, \rho, \delta$ | self-reinforcement, temperature, reward weight, source advantage, walk cost |

One round, for every listener at once:

$$P_{kj} = \frac{A_{kj}}{\sum_{j'} A_{kj'}} \tag{1}$$

$$Z = \left(I - e^{-\delta}P\right)^{-1}, \qquad D_k = -\ln\frac{Z_{sk}}{Z_{kk}} \;(k \ne s), \qquad D_s = \frac{\min_{k\ne s} D_k}{\rho} \tag{2}$$

$$S_{ki} = D_k^{\,\kappa-1}\,A_{ki}^{\,\kappa} \tag{3}$$

$$R_{ki} = \frac{S_{ki}^{1/T}}{\sum_{k' \ne i} S_{k'i}^{1/T}} \tag{4}$$

$$A'_{ki} = \frac{A_{ki} + \varepsilon R_{ki}}{1 + \varepsilon} \tag{5}$$

The site's code divides each $D_k$ by $\sum_j D_j$ before scoring. That factor is the same for every candidate, so it
cancels in (4) and is left out here.

<!-- fold: B1 · The blend is a moving average with memory τ_m = 1/ln(1 + ε) -->
**Claim.** Step (5) keeps a geometrically fading record of past rewards. A reward from $m$ rounds ago has weight
proportional to $e^{-m/\tau_m}$, with $\tau_m = 1/\ln(1+\varepsilon)$.

<!-- step: Split the blend into two weights that sum to one -->
Write (5) with the two coefficients made explicit:

$$A' = \frac{1}{1+\varepsilon}\,A + \frac{\varepsilon}{1+\varepsilon}\,R = \beta A + (1-\beta) R, \qquad \beta = \frac{1}{1+\varepsilon}.$$

For $\varepsilon > 0$, $\beta$ lies in $(0, 1)$, so $A'$ is a weighted average of the old attention and the new reward.

<!-- step: The budget is kept without renormalizing -->
Both $A$ and $R$ have columns that sum to 1 and zero diagonals, so

$$\sum_k A'_{ki} = \beta \cdot 1 + (1-\beta)\cdot 1 = 1, \qquad A'_{ii} = \beta\cdot 0 + (1-\beta)\cdot 0 = 0.$$

Every agent still has exactly one unit of attention after the blend.

<!-- step: Unroll the recursion over t rounds -->
Substitute $A_{t-1} = \beta A_{t-2} + (1-\beta) R_{t-2}$ into $A_t = \beta A_{t-1} + (1-\beta) R_{t-1}$ and repeat:

$$A_t = \beta^{t} A_0 + (1-\beta)\sum_{m=1}^{t} \beta^{\,m-1} R_{t-m}.$$

The reward received $m$ rounds back carries weight $(1-\beta)\beta^{m-1}$. The weights on rewards add up to
$1 - \beta^t$, and the starting attention keeps the rest, $\beta^t$, which goes to zero.

<!-- step: Read off the memory time -->
Write the decay as an exponential:

$$\beta^{m} = e^{-m \ln(1+\varepsilon)} = e^{-m/\tau_m}, \qquad \tau_m = \frac{1}{\ln(1+\varepsilon)}.$$

After $\tau_m$ rounds a reward's weight has fallen by a factor $e$.

<!-- step: Put in numbers -->
- $\varepsilon = 1$ (the 2020 model and the cost studies): $\beta = 1/2$ and $\tau_m = 1/\ln 2 \approx 1.44$ rounds.
- Small $\varepsilon$: $\ln(1+\varepsilon) \approx \varepsilon$, so $\tau_m \approx 1/\varepsilon$ rounds.
- Large $\varepsilon$: $\tau_m < 1$; the newest reward dominates.
<!-- /steps -->

**Check.** Exact identity, verified to machine precision against the model and the thesis code
(`test_ss_model.py`, `tools/legacy_oracle`). Used by [E1](/appendix/e1/), [E4](/appendix/e4/) and
[E7](/appendix/e7/).

<!-- fold: B2 · One round is a forward-Euler step of the logit flow -->
**Claim.** For a fixed source, step (5) is exactly one forward-Euler step, of size $h = \varepsilon/(1+\varepsilon)$, of
the flow $\dot A = R(A) - A$. No approximation is involved.

<!-- step: Rearrange the blend as old value plus increment -->
$$A' - A = \frac{A + \varepsilon R}{1+\varepsilon} - \frac{(1+\varepsilon)A}{1+\varepsilon} = \frac{\varepsilon}{1+\varepsilon}\,\bigl(R(A) - A\bigr).$$

$R$ depends on $A$ through the shares (1), the distances (2) and the scores (3). With the source fixed, $R(A)$ is a
fixed function of $A$.

<!-- step: Compare with the Euler rule -->
The forward-Euler step of size $h$ for $\dot A = F(A)$ is $A_{n+1} = A_n + h\,F(A_n)$. With $F(A) = R(A) - A$ and

$$h = \frac{\varepsilon}{1+\varepsilon} = 1 - \beta,$$

this is the rearranged blend term for term.

<!-- step: Why it is called a logit flow -->
By (4), $R$ is a softmax in each column: $R_{ki} = \exp\bigl(\tfrac{1}{T}\ln S_{ki}\bigr) / \sum_{k'}\exp\bigl(\tfrac{1}{T}\ln S_{k'i}\bigr)$.
A flow of the form $\dot x = \operatorname{softmax}(\text{payoff}/\eta) - x$ is the logit dynamics of evolutionary game
theory. Here the payoff is the log score $\ln S_{ki}$ and the noise level is $T$.

<!-- step: What the step size means -->
$h$ lies in $(0, 1)$, so $A'$ lies on the segment between $A$ and $R(A)$: the step never overshoots the reward. As
$\varepsilon \to 0$, $h \approx \varepsilon$, and $n$ rounds follow the flow for a time $t = n h$.

<!-- step: Map and flow share fixed points and stability -->
$A' = A$ exactly when $R(A) = A$, for every $\varepsilon$; that is the starting point of B3. Linearizing, if the
reward map has an eigenvalue $\mu$ at a fixed point, the round has eigenvalue

$$1 + h(\mu - 1) = \frac{1 + \varepsilon\mu}{1+\varepsilon}.$$

For real $\mu \ge 0$ this is positive and below 1 exactly when $\mu < 1$, so the step size cannot create an
oscillating instability. With $\mu = \kappa/T$ (B5, A2) it gives the contraction rate $(1+\varepsilon\kappa/T)/(1+\varepsilon)$.
<!-- /steps -->

**Check.** `py/tests/test_continuum.py`.

<!-- fold: B3 · Fixed points are softmaxes of −ln D at T_eff = (T − κ)/(1 − κ) -->
**Claim.** At any fixed point, every listener's attention is a softmax of the closeness $-\ln D_k$ at the effective
temperature $T_{\text{eff}} = (T-\kappa)/(1-\kappa)$. These are the rest points of Sato–Crutchfield replicators with
reward $-\ln D$.

<!-- step: Write the fixed-point condition for one column -->
By B2 a fixed point satisfies $A = R(A)$. For listener $i$, using (3) and (4):

$$A_{ki} = \frac{\bigl(D_k^{\,\kappa-1}A_{ki}^{\,\kappa}\bigr)^{1/T}}{C_i}, \qquad C_i = \sum_{k'\ne i} S_{k'i}^{1/T}.$$

$C_i$ is one number per column.

<!-- step: Take logarithms -->
$$\ln A_{ki} = \frac{\kappa-1}{T}\ln D_k + \frac{\kappa}{T}\ln A_{ki} - \ln C_i.$$

<!-- step: Collect the attention terms and solve -->
Move $\tfrac{\kappa}{T}\ln A_{ki}$ to the left:

$$\Bigl(1 - \frac{\kappa}{T}\Bigr)\ln A_{ki} = -\frac{1-\kappa}{T}\ln D_k - \ln C_i.$$

Multiply by $T/(T-\kappa)$ (assuming $T \ne \kappa$):

$$\ln A_{ki} = -\frac{1-\kappa}{T-\kappa}\,\ln D_k + c_i, \qquad c_i = -\frac{T}{T-\kappa}\ln C_i .$$

<!-- step: Exponentiate and normalize the column -->
$c_i$ is the same for every $k$, so it is fixed by the budget $\sum_k A_{ki} = 1$:

$$A_{ki} = \frac{\exp\bigl(-\ln D_k / T_{\text{eff}}\bigr)}{\sum_{k'\ne i}\exp\bigl(-\ln D_{k'}/T_{\text{eff}}\bigr)} = \frac{D_k^{-1/T_{\text{eff}}}}{\sum_{k'\ne i} D_{k'}^{-1/T_{\text{eff}}}}, \qquad T_{\text{eff}} = \frac{T-\kappa}{1-\kappa}.$$

Self-reinforcement lowers the effective temperature: $\kappa$ acts as extra commitment. At $\kappa = 0$,
$T_{\text{eff}} = T$.

<!-- step: Read it as a self-consistency condition -->
$D$ depends on $A$ through (1) and (2), so the last line is an equation for $A$, not an explicit solution. It still
fixes the form: at a fixed point, attention is ranked exactly by closeness to the news, as a power law
$D^{-1/T_{\text{eff}}}$.

<!-- step: The sign of the effective temperature -->
For $T > \kappa$, $T_{\text{eff}} > 0$ and closer agents get more attention. For $T < \kappa$, $T_{\text{eff}} < 0$
and the formula would give more to farther agents. Such interior fixed points exist but repel (B5, A2, A3): the state
runs off to a corner, which is lock-in.

<!-- step: Match the Sato–Crutchfield rest points -->
Replicators with memory loss evolve as

$$\dot x_k = x_k\Bigl[\beta\Bigl(r_k - \sum_j x_j r_j\Bigr) - \alpha\Bigl(\ln x_k - \sum_j x_j \ln x_j\Bigr)\Bigr].$$

At a rest point with every $x_k > 0$, the bracket is zero, so $\beta r_k - \alpha \ln x_k$ is the same for all $k$ and
$x_k \propto e^{\beta r_k/\alpha}$: a softmax of $r$ at temperature $\alpha/\beta$. With $r_k = -\ln D_k$ and
$\alpha/\beta = T_{\text{eff}}$ these are the fixed points above. The two flows differ; their rest points coincide.
<!-- /steps -->

**Check.** A 600-step simulation reaches the softmax to $10^{-9}$ (`py/tests/test_continuum.py`).

<!-- fold: B4 · The note's one-relay reduction (proposed; not the model at δ = 10) -->
**Claim.** The synthesis note proposed a reduction in which relays carry weight: attending to a peer pays $\gamma$
times that peer's attention to the source, as if the news passed through it. Its fixed point is unique, with
$T_{1/2} = (1-\gamma/2)/\ln(N-2)$. It is kept for comparison. At $\delta = 10$ the model has no such relay gain, and its
$T_{1/2}$ is the one in B5.

<!-- step: Assume the symmetric state -->
Every listener puts $x$ on the source and spreads $1 - x$ evenly over the $N-2$ other agents.

<!-- step: Assign payoffs -->
Attending to the source pays 1. Attending to a peer pays $\gamma x$: the peer passes on news in proportion to how much
it listens to the source.

<!-- step: Take the softmax at temperature T -->
$$x = \frac{e^{1/T}}{e^{1/T} + (N-2)\,e^{\gamma x/T}} = \frac{1}{1 + (N-2)\,e^{-(1-\gamma x)/T}}.$$

<!-- step: Show there is exactly one solution -->
The left side rises from 0 to 1 as $x$ goes from 0 to 1. For $\gamma > 0$ the right side is positive at $x = 0$ and
falls as $x$ grows, because a larger $x$ raises the peers' payoff. The two curves cross exactly once in $(0, 1)$.

<!-- step: Find the half point -->
Set $x = 1/2$: then $(N-2)\,e^{-(1-\gamma/2)/T} = 1$, so

$$T_{1/2} = \frac{1 - \gamma/2}{\ln(N-2)}.$$

<!-- step: Compare with B5 -->
Both half points scale as $1/\ln(N-2)$. Half attention needs the source's advantage, in units of temperature, to equal
$\ln(N-2)$, the log of the number of rivals. In B4 that advantage is $1 - \gamma/2$; in the model it is $\ln\rho$ at
temperature $T_{\text{eff}}$ (B5, step 6). At $\delta = 10$ the distances from the source do not depend on $x$ (B5,
step 2), so the model has no relay gain and $\gamma$ has no counterpart.
<!-- /steps -->

**Status.** Proposed, not the model's behaviour. Code: `nichenet/continuum/one_relay.py`.

<!-- fold: B5 · The symmetric state reduces to one variable -->
**Claim.** With a constant source, the symmetric state follows a one-variable map with fixed point
$u^* = \rho^{(1-\kappa)/(T-\kappa)}$, contraction $(1+\varepsilon\kappa/T)/(1+\varepsilon)$ per round, and half
attention at $T_{1/2} = \kappa + (1-\kappa)\ln\rho/\ln(N-2)$. Below $T = \kappa$ it condenses.

<!-- step: Define the symmetric state -->
The source $s$ stays put. Every listener $i \ne s$ gives $x$ to $s$ and $p = (1-x)/(N-2)$ to each of the other $N-2$
agents. The source spreads its own attention evenly, $1/(N-1)$ to each. One number, $x$, describes the network.

<!-- step: All distances from the source are equal -->
Row $s$ of $P$ is the source's audience. Every listener gives the source the same $x$, so by (1)

$$P_{sk} = \frac{x}{(N-1)\,x} = \frac{1}{N-1} \quad\text{for every } k \ne s,$$

whatever $x$ is. At large $\delta$, $Z = I + e^{-\delta}P + e^{-2\delta}P^2 + \dots$ gives

$$D_k \approx \delta - \ln P_{sk} = \delta + \ln(N-1) \equiv D \quad\text{for every relay } k.$$

([A1](/appendix/analysis/) shows that the equality holds at any $\delta$.) The source's own distance is $D_s = D/\rho$.

<!-- step: Write the scores in one listener's column -->
By (3), a listener scores

$$\text{source: } (D/\rho)^{\kappa-1}x^{\kappa}, \qquad \text{each of the } N-2 \text{ peers: } D^{\kappa-1}p^{\kappa}.$$

<!-- step: Form the reward ratio; D cancels -->
Divide the two scores and set $u = x/p$:

$$\frac{S_s}{S_k} = \rho^{1-\kappa}\Bigl(\frac{x}{p}\Bigr)^{\kappa} = \rho^{1-\kappa}u^{\kappa}, \qquad \frac{R_s}{R_k} = \bigl(\rho^{1-\kappa}u^{\kappa}\bigr)^{1/T}.$$

The source's share of the reward is

$$r(x) = \frac{a}{a + (N-2)\,b}, \qquad a = \bigl(\rho^{1-\kappa}x^{\kappa}\bigr)^{1/T}, \quad b = \bigl(p^{\kappa}\bigr)^{1/T}.$$

<!-- step: Show the state stays symmetric -->
Every listener's column sees the same numbers, so after (5) each still has $x' = (x + \varepsilon r)/(1+\varepsilon)$
on the source and $(1-x')/(N-2)$ on each peer. In the source's own column all candidates have the same distance and
the same weight, so it stays even. The network therefore follows

$$x \mapsto \frac{x + \varepsilon\, r(x)}{1+\varepsilon}.$$

<!-- step: Solve for the fixed point -->
$x^* = r(x^*)$ means that the attention ratio equals the reward ratio: $u = (\rho^{1-\kappa}u^{\kappa})^{1/T}$. Taking
logs, $T\ln u = (1-\kappa)\ln\rho + \kappa\ln u$, so

$$u^* = \rho^{(1-\kappa)/(T-\kappa)}, \qquad x^* = \frac{u^*}{u^* + N - 2},$$

using $x = up$ and $x + (N-2)p = 1$. This agrees with B3: a softmax of $-\ln D$ at $T_{\text{eff}}$ gives the source,
which is closer by $\ln\rho$, the ratio $u = \rho^{1/T_{\text{eff}}}$.

<!-- step: Find the slope at the fixed point -->
Work in logits. With $y = \ln\frac{x}{1-x} = \ln u - \ln(N-2)$ and

$$z = \ln\frac{r}{1-r} = \ln\frac{a}{(N-2)b} = \frac{1-\kappa}{T}\ln\rho + \frac{\kappa}{T}\ln u - \ln(N-2),$$

$dz/dy = \kappa/T$. By the chain rule, $\frac{dr}{dx} = r(1-r)\cdot\frac{dz}{dy}\cdot\frac{1}{x(1-x)}$, which is
$\kappa/T$ at the fixed point, where $r = x$. The slope of the map is

$$\frac{d}{dx}\,\frac{x + \varepsilon r(x)}{1+\varepsilon}\bigg|_{x^*} = \frac{1 + \varepsilon\kappa/T}{1+\varepsilon}.$$

<!-- step: Decide stability -->
The slope is positive. It is below 1 exactly when $\varepsilon\kappa/T < \varepsilon$, i.e. $T > \kappa$. Above
$\kappa$ the symmetric state attracts and deviations shrink by that factor each round. Below $\kappa$ it repels, and
attention condenses onto one candidate: the source, or a rival ([A3](/appendix/analysis/) says which).

<!-- step: Find the half point T½ -->
$x^* = 1/2$ means $u^* = N - 2$, i.e. $(1-\kappa)\ln\rho/(T-\kappa) = \ln(N-2)$:

$$T_{1/2} = \kappa + (1-\kappa)\,\frac{\ln\rho}{\ln(N-2)}.$$

With $\rho = 2.6$ and $\kappa = 0.2$: $T_{1/2} = 0.568$ at $N = 10$ and $0.410$ at $N = 40$.

<!-- step: Say when the large-δ form holds -->
Expanding $Z$,

$$D_k = \delta - \ln P_{sk} - \ln\Bigl(1 + e^{-\delta}\,\frac{(P^2)_{sk}}{P_{sk}} + \dots\Bigr) + \ln Z_{kk}, \qquad Z_{kk} = 1 + O(e^{-2\delta}).$$

The correction is small while $P_{sk} \gg e^{-\delta}$ ($4.5\times10^{-5}$ at $\delta = 10$). Strong selection drives
some weights below that, and then two-step paths set the distance. In the symmetric state step 2 holds regardless
(A1).
<!-- /steps -->

**Check.** The simulated fixed point equals $x^*$ to $10^{-9}$. Tests: `py/tests/test_continuum.py`,
`py/tests/test_large_delta.py`.
