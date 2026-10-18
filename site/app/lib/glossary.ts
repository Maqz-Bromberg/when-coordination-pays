/** Shared definitions for the side key (KeySidebar), grouped by where each term comes from. */
export type GroupId = "ss" | "nl" | "tr" | "hc" | "ext" | "an";
export type GlossaryEntry = { term: string; group: GroupId; def: string; see?: { label: string; href: string } };

export const GROUPS: { id: GroupId; label: string; source: string; color: string }[] = [
  { id: "ss", label: "Source to structure", source: "Bromberg 2020 thesis", color: "var(--ss)" },
  { id: "nl", label: "Niche learning", source: "Lee, Flack & Krakauer 2024", color: "var(--nl)" },
  { id: "tr", label: "Adaptive transport", source: "Corson 2010; Katifori et al. 2010; Ronellenfitsch & Katifori 2016", color: "var(--tr)" },
  { id: "hc", label: "Hierarchy coordinates", source: "Corominas-Murtra et al. 2013", color: "var(--hc)" },
  { id: "ext", label: "Extensions and measures", source: "this project", color: "var(--ext)" },
  { id: "an", label: "Analysis", source: "this project: bridges B1–B5, A1–A4", color: "var(--an)" },
];

export const GLOSSARY: Record<string, GlossaryEntry> = {
  // ---------------------------------------------------------------- 2020 thesis
  ss: {
    group: "ss", term: "Source-to-structure (SS) model",
    def: "Every step a source node is seeded with information. Each node rewards its in-edges by how close the sender sits to the source and by the edge's own weight, then renormalizes. Repeated, this turns where information appears into network structure.",
    see: { label: "Source to structure", href: "/results/source-structure/" },
  },
  rwed: {
    group: "ss", term: "RWED D (random-walk effective distance)",
    def: "D = −ln(Z · Diag(Z)⁻¹), Z = (I − e^(−δ)P)⁻¹ with P the row-normalized attention. Short when many likely walks connect two nodes. At large δ, D_sk ≈ δ − ln T_sk with T_sk the share of the walk from s that steps to k, so it is a surprisal along the network.",
    see: { label: "Bridges B5", href: "/results/#bridges-b2-b3-b5" },
  },
  delta: { group: "ss", term: "δ (walk cost)", def: "Cost per step in the RWED. Large δ means only the most direct paths count. The thesis uses δ = 10." },
  rho: {
    group: "ss", term: "ρ (source substitution)",
    def: "The source's own distance is set to min_k D_k / ρ, so attending directly to the source beats the best relay by the factor ρ = 2.6. In the symmetric state this is the only thing that singles out the source.",
  },
  infoscore: {
    group: "ss", term: "Info score",
    def: "S_ki = D_k^(κ−1) A_ki^κ: the value node i assigns to its in-edge from k. The first factor rewards senders close to the source, the second rewards edges that are already strong.",
  },
  kappa: {
    group: "ss", term: "κ (edge conservation)",
    def: "Exponent on the edge's own weight in the info score: the model's self-reinforcement. κ = 0 rewards distance only; κ → 1 rewards existing weight only. It sets the lock-in threshold T = κ.",
  },
  eps: {
    group: "ss", term: "ε (reward weight / memory)",
    def: "Update A ← (A + ε r)/(1 + ε): an exponential average of rewards with memory τ_m = 1/ln(1 + ε). The thesis code fixes ε = 1, a memory of about 1.4 steps.",
    see: { label: "E1", href: "/results/#e1-optimal-reinforcement-memory-against-source-persistence" },
  },
  phi: { group: "ss", term: "φ (cut)", def: "Thesis selection: only in-edges scoring in the top fraction (1 − φ) are rewarded. φ = 1 rewards a single edge per node." },
  selectivity: {
    group: "ss", term: "Selectivity",
    def: "How few in-links an agent rewards each round. With the φ cut it rewards only its top fraction (1 − φ); tempered selection replaces the cut by a temperature.",
    see: { label: "Validation, quirks", href: "/validation/" },
  },
  seeding: { group: "ss", term: "Seeding", def: "Which node receives the information each step: constant (one node), random (a new node every step), or, in the extensions, Markov with dwell time τ_E and noisy." },
  lockin: {
    group: "ss", term: "Lock-in",
    def: "A node's attention settles on a node other than the source and stays there, because self-reinforcement (κ) outweighs the source's distance advantage.",
  },
  faithful: {
    group: "ss", term: "Faithful vs clean mode",
    def: "Faithful reproduces the thesis code with its quirks (Q1–Q7). Clean fixes them. Columns are always faithful on the left and clean on the right.",
    see: { label: "Validation", href: "/validation/" },
  },
  // ---------------------------------------------------------------- Lee, Flack & Krakauer
  nl: {
    group: "nl", term: "Niche learning (NL)",
    def: "Agents estimate a switching environment with a memory of time scale τ_m. Too short a memory tracks noise, too long a memory goes stale, so there is an optimal memory for each pace of the environment.",
    see: { label: "Niche learning", href: "/results/niche-learning/" },
  },
  tauM: { group: "nl", term: "τ_m (memory)", def: "Time scale over which a learner averages its observations. In SS it is 1/ln(1 + ε)." },
  tauE: { group: "nl", term: "τ_E (environment pace)", def: "Mean time between environment switches; in SS extensions, the mean dwell time of the true source." },
  divergence: {
    group: "nl", term: "Divergence D",
    def: "Lee et al.'s fitness: the KL divergence between the environment's state and the agent's estimate, averaged over time. The SS log-loss used here is the same kind of quantity, which is what connects the two models.",
  },
  bias_variance: {
    group: "nl", term: "Bias–variance trade-off",
    def: "Short memory follows the environment but is noisy; long memory is smooth but stale. The optimum τ_m* grows like τ_E^(1/2).",
  },
  stabilizer: {
    group: "nl", term: "Stabilizer / destabilizer",
    def: "Agents that slow (stabilizers) or speed up (destabilizers) the environment they track; passive agents leave it alone.",
  },
  invasion: {
    group: "nl", term: "Invasion fitness",
    def: "Growth of a rare mutant memory in a resident population. A memory that cannot be invaded is evolutionarily stable.",
    see: { label: "Invasion", href: "/results/invasion/" },
  },
  // ---------------------------------------------------------------- transport
  tr: {
    group: "tr", term: "Adaptive transport network",
    def: "Links grow with the flow they carry under a material budget, as veins, leaf venation or slime moulds do. A steady load gives trees; a fluctuating load keeps loops.",
    see: { label: "Transport", href: "/results/transport/" },
  },
  conductance: { group: "tr", term: "Conductance C", def: "How easily an edge carries flow. Here the symmetrized attention (A_ij + A_ji)/2, scaled so all conductances sum to 1." },
  kirchhoff: {
    group: "tr", term: "Kirchhoff currents",
    def: "Inject flow at a source, withdraw it at the sinks, and solve for potentials so that flow is conserved at every node. The current on an edge is C × (potential difference).",
  },
  dissipation: {
    group: "tr", term: "Dissipation Σ I²/C",
    def: "Energy lost moving the flow: like resistive heating in a circuit or pressure loss in a vessel. Squeezing a lot of current through few links costs much more than spreading it.",
  },
  gamma: { group: "tr", term: "γ (Corson cost exponent)", def: "Material cost Σ C^γ. γ < 1 favours trees; γ > 1 favours loops. In E6, p = 1/(1 + γ)." },
  loops: { group: "tr", term: "Loops", def: "Independent cycles of the backbone (edges carrying at least 0.1 of the receiving node's strongest in-weight)." },
  budget: {
    group: "tr", term: "Budget (E6)",
    def: "What is conserved: each node's in-weight (SS attention) or one global sum (transport material).",
    see: { label: "E6", href: "/results/e6/" },
  },
  // ---------------------------------------------------------------- hierarchy coordinates
  morphospace: {
    group: "hc", term: "Hierarchy morphospace",
    def: "The cube of treeness, feedforwardness and orderability. A perfect pyramid sits at (1, 1, 1); a fully cyclic graph near the origin.",
    see: { label: "Errata H1/H2", href: "/errata/" },
  },
  treeness: { group: "hc", term: "Treeness T", def: "In [−1, 1]: positive when paths converge onto few top nodes, negative when they fan out from few bottom nodes." },
  ff: { group: "hc", term: "Feedforwardness F", def: "In [0, 1]: the fraction of path weight that avoids cycles." },
  order: { group: "hc", term: "Orderability O", def: "In [0, 1]: the fraction of nodes outside any cycle." },
  plateau: {
    group: "hc", term: "0.88 plateau",
    def: "Weighted graphs are scored over 8 weight thresholds. A star scores 1 at 7 of them and 0 at the lowest, so full hierarchy reads 7/8 = 0.875.",
  },
  // ---------------------------------------------------------------- extensions and measures
  T: {
    group: "ext", term: "T (selection temperature)",
    def: "Tempered selection rewards in proportion to score^(1/T). Low T commits hard to the best edge, T = 1 is proportional reward, and T → 0 approaches the φ = 1 cut.",
    see: { label: "E5", href: "/results/e5/" },
  },
  nu: { group: "ext", term: "ν (signal noise)", def: "Probability that the seed is a uniformly random node instead of the true source." },
  N: { group: "ext", term: "N (niche size)", def: "Number of nodes: the number of possible sources and of agents sharing the niche." },
  tracking: { group: "ext", term: "Tracking", def: "Mean attention of the other nodes on the current true source, over the second half of a run." },
  commitment: { group: "ext", term: "Commitment", def: "Mean over nodes of the largest in-weight. 1 means every node attends to a single node." },
  logloss: {
    group: "ext", term: "Log-loss",
    def: "Mean over nodes of −ln A[s, i] on the true source s: the Kelly price of the attention bet, i.e. KL(δ_s ‖ attention). Uniform attention scores ln(N − 1).",
    see: { label: "E1", href: "/results/#e1-optimal-reinforcement-memory-against-source-persistence" },
  },
  nat: {
    group: "ext", term: "nat (unit)",
    def: "The unit of information when logarithms are natural: 1 nat = 1/ln 2 ≈ 1.44 bits. A bet that puts the share a on what happens costs −ln a nats; putting 1/2 on it costs 0.69 nats, putting 1/(N − 1) on it costs ln(N − 1). For 40 agents the most coordination can gain is ln 39 ≈ 3.7 nats (5.3 bits) per round.",
  },
  benefit: { group: "ext", term: "Benefit", def: "ln(N − 1) − log-loss: nats gained over uniform attention. At most ln(N − 1); very negative when attention sits on stale nodes." },
  cost: {
    group: "ext", term: "Cost (dissipation)",
    def: "Broadcast dissipation of the attention network, averaged over sources, relative to the uniform network. 1 = uniform; a hub is about 2.",
    see: { label: "E6", href: "/results/e6/" },
  },
  infocost: {
    group: "ext", term: "Information cost",
    def: "Mean over nodes of KL(attention ‖ uniform) = ln(N − 1) − H(attention): how far attention departs from indifference, in the same nats as the benefit. It is the same for a right and a wrong bet of equal confidence.",
  },
  calibration: {
    group: "ext", term: "Calibration gap",
    def: "Benefit − information cost. About 0 for a calibrated bettor (the Bayes filter). Strongly negative when confident on the wrong node (over-betting), positive when attention is more spread than its accuracy warrants.",
  },
  edcost: { group: "ext", term: "ED cost", def: "Increase of the mean all-to-all RWED over the uniform network. It does not see how concentrated attention is, so it is not used as the main cost." },
  likelihood: {
    group: "ext", term: "Likelihood (KL) reward",
    def: "Replaces D_k^(κ−1) by λ^(1−κ) on the seeded node and 1 elsewhere, keeping A^κ: a Kelly / multiplicative-weights reward for direct evidence. With λ = ρ it equals the RWED reward in the symmetric state but has no relays.",
  },
  bayes: {
    group: "ext", term: "Bayes filter",
    def: "The exact posterior over the source given every seed so far, the noise ν and the pace τ_E. No rule can reach a lower expected log-loss from the same observations.",
  },
  usage: { group: "ext", term: "Usage (E6)", def: "What an edge is rewarded for: the SS info score (RWED) or the squared Kirchhoff current (flux)." },
  p: { group: "ext", term: "p (concentration, E6)", def: "Usage is raised to p before normalizing. For SS, T = 1/p; for transport, γ = 1/p − 1." },
  hierarchy: { group: "ext", term: "Hierarchy regime", def: "κ < T < T½ under a persistent source: attention concentrates on the current source and follows it." },
  overbetting: { group: "ext", term: "Over-betting", def: "Attention concentrated (commitment ≥ 0.5) but mostly on a node that is no longer the source." },
  distributed: { group: "ext", term: "Distributed regime", def: "T above T½: no node receives the majority of anyone's attention." },
  // ---------------------------------------------------------------- analysis
  Teff: { group: "an", term: "T_eff", def: "(T − κ)/(1 − κ). Fixed points are column softmaxes of −ln D at this temperature, as for Sato–Crutchfield replicators (B3)." },
  symmetric: {
    group: "an", term: "Symmetric state",
    def: "Every node puts x on the source and splits the rest equally over its peers. The SS map reduces exactly to one variable here (B5, A1).",
  },
  Thalf: {
    group: "an", term: "T½",
    def: "κ + (1 − κ) ln ρ / ln(N − 2): above it the symmetric fixed point puts under half the attention on a constant source. The hierarchy window (κ, T½) narrows as 1/ln N.",
    see: { label: "E5", href: "/results/e5/" },
  },
  Tkappa: { group: "an", term: "T = κ", def: "Below it the symmetric state is unstable: attention condenses on whichever node is ahead." },
  bulk: { group: "an", term: "Bulk rate", def: "(1 + εκ/T)/(1 + ε): contraction per step of the symmetric state and most tangent modes; below 1 iff T > κ (A2)." },
  kink: { group: "an", term: "Kink (A2)", def: "min_k D_k / ρ makes the map piecewise smooth; at the symmetric point all relays tie, so it is linearized one anchored piece at a time." },
  separatrix: {
    group: "an", term: "Separatrix (A3)",
    def: "Below T = κ a node locks onto its strongest peer q iff initially w_q / w_s > ρ^((1−κ)/(κ−T)). The initial weights decide, not the signal.",
  },
  meanfield: { group: "an", term: "Noisy mean field (A4)", def: "The symmetric map with the reward averaged over the noise: E[r] = (1 − ν + ν/N) f(x) + ν (N − 1)/N g(x)." },
  relay: {
    group: "an", term: "Relay effect",
    def: "When a noise seed j fires, the true source is the closest relay to j, so it keeps more reward than an ordinary peer would. RWED has it; the likelihood reward does not.",
  },
  heterogeneity: {
    group: "an", term: "Peer heterogeneity",
    def: "Unequal weights among a node's peers. For T > κ the score w^(κ/T) is concave, so uneven peers compete less with the source in total. This is what keeps tracking high near κ under noise (A4 test).",
  },
};

export function entries(keys: string[]): (GlossaryEntry & { key: string })[] {
  return keys.map((key) => {
    const e = GLOSSARY[key];
    if (!e) throw new Error(`glossary: unknown term ${key}`);
    return { key, ...e };
  });
}
