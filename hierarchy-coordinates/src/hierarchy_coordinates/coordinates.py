"""Hierarchy coordinates (treeness T, feedforwardness F, orderability O) for weighted directed graphs.

Follows Corominas-Murtra, Goñi, Solé & Rodríguez-Caso (2013), PNAS 110:13316, appendix D of arXiv:1303.2503
(eqs. D2-D9; eq. 14 of the PNAS SI is the path-probability sum), applied to weighted graphs as in the 2020
thesis: threshold the weights into binary graphs, condense each to a node-weighted DAG, keep its largest weakly
connected component, compute (T, F, O) and average over thresholds.

``variant="corominas"`` (default) uses the paper's definitions. ``variant="thesis"`` reproduces
``hierarchy_coordinates.py`` in the thesis code (github.com/MaxBromberg/Networks_Via_Diffusion, commit 6eeb396),
which differs in two ways (see the README):

1. Path probabilities use element-wise powers ``np.power(B, k)`` for k = 0 .. n-1 instead of matrix powers B^k.
   Because 0**0 = 1 the k = 0 term is the all-ones matrix, so every pair gets probability >= 1 and the entropies
   collapse to H_b = sum_{v not maximal} log k_in(v) and H_f = sum_{v not minimal} log k_out(v), with no weighting
   by whether a path actually crosses v. (The forward entropy also uses the column-normalized B.)
2. Treeness averages over the top-down and bottom-up pruning sequences each including G, so G counts twice,
   and pruned subgraphs without links count as f = 0. The paper averages f once over G and the pruned subgraphs
   that still contain a link (eq. D9).

The paper prints the probability sums from k = 1 (eqs. D4, D6). Taken literally that gives H_f = 0 for a single
fork a -> {b, c}, and T = 0 for directed trees, contradicting its own Lemma (T = F = O = 1 for trees with
equal-length leaves) and Figs. 12-13. The k = 0 identity term is therefore included here.
"""

import copy
from collections import namedtuple

import networkx as nx
import numpy as np

HierarchyCoordinates = namedtuple("HierarchyCoordinates", "treeness feedforwardness orderability")

VARIANTS = {
    "corominas": dict(power="matrix", subgraphs="paper"),
    "thesis": dict(power="elementwise", subgraphs="thesis"),
    "thesis_matrix_power": dict(power="matrix", subgraphs="thesis"),  # isolates error 1
}


# ---------------------------------------------------------------------------- thresholds and condensation

def exponential_thresholds(exponent, dist_max, dist_min, n):
    """``utility_funcs.exponentially_distribute`` from the thesis code (note: not offset by dist_min)."""
    total = np.exp(exponent * 2 * np.e) - np.exp(exponent * np.e)
    props = [(np.exp(exponent * (np.e + np.e / (n - i))) - np.exp(exponent * np.e)) / total for i in range(n)]
    return np.array(props) * (dist_max - dist_min)


def thresholds_for(A, num_thresholds=8, exp_threshold_distribution=None):
    if exp_threshold_distribution is None:
        lo, hi = np.min(A), np.max(A)
        step = np.max(A - lo) / num_thresholds
        try:
            th = list(np.round(np.arange(lo, hi, step), 4))
        except (ValueError, ZeroDivisionError):
            th = [hi] * num_thresholds
        return th if th else [hi] * num_thresholds
    return list(exponential_thresholds(exp_threshold_distribution, np.max(A), np.min(A), num_thresholds))


def node_weighted_condense(A, num_thresholds=8, exp_threshold_distribution=None):
    """Binary graphs A > threshold, and the largest weakly connected component of each one's condensation,
    with node weight = number of original nodes in the strongly connected component."""
    graphs = [nx.from_numpy_array(np.where(A > t, 1, 0), create_using=nx.DiGraph)
              for t in thresholds_for(A, num_thresholds, exp_threshold_distribution)]
    condensed = []
    for g in graphs:
        c = nx.condensation(g)
        comp = max(nx.weakly_connected_components(c), key=len)
        largest = nx.convert_node_labels_to_integers(c.subgraph(comp).copy())
        for node, members in nx.get_node_attributes(largest, "members").items():
            largest.nodes[node]["weight"] = len(members)
        condensed.append(largest)
    return condensed, graphs


# ---------------------------------------------------------------------------- layers

def max_min_layers(G, max_layer=True):
    """Maximal layer (k_in = 0) or minimal layer (k_out = 0)."""
    if max_layer:
        return [v for v in G.nodes() if G.in_degree(v) == 0]
    return [v for v in G.nodes() if G.out_degree(v) == 0]


def leaf_removal(G, forward=True):
    peeled = copy.deepcopy(G)
    peeled.remove_nodes_from(max_min_layers(G, max_layer=forward))
    return peeled


def recursive_leaf_removal(G, from_top=True):
    """[G, G minus its top (or bottom) layer, ...] down to at most one node, as in the thesis code."""
    out = [copy.deepcopy(G)]
    while len(out[-1].nodes()) > 1:
        out.append(leaf_removal(out[-1], forward=from_top))
    return out


# ---------------------------------------------------------------------------- O and F

def orderability(condensed):
    """Fraction of original nodes that are not part of any cycle (thesis: counted on the largest component)."""
    w = nx.get_node_attributes(condensed, "weight")
    return sum(1 for v in w.values() if v == 1) / sum(w.values())


def _feedforwardness_iteration(G):
    top, bottom = max_min_layers(G, True), max_min_layers(G, False)
    weights = nx.get_node_attributes(G, "weight")
    g, num_paths = 0.0, 0
    for s in top:
        for t in bottom:
            if s == t:  # networkx >= 3 yields the trivial path [s] here; networkx 2.x (used by the thesis) yields none
                continue
            for path in nx.all_simple_paths(G, source=s, target=t):
                g += len(path) / sum(weights[v] for v in path)
                num_paths += 1
    return g, num_paths


def feedforwardness(dag):
    """Eq. D2: average of F(path) = |path| / sum of node weights over maximal-to-minimal paths of G_C and of the
    bottom-up pruned subgraphs."""
    peeled = recursive_leaf_removal(dag, from_top=False)
    if len(peeled) == 1 and len(peeled[0].nodes()) == 1:
        return 0.0
    graphs = peeled[:-1] if len(peeled[-1].nodes()) == 1 else peeled
    f, total = 0.0, 0
    for G in graphs:
        g, paths = _feedforwardness_iteration(G)
        f += g
        total += paths
    return f / total if total else 0.0


# ---------------------------------------------------------------------------- treeness

def _path_probabilities(M, power):
    """sum_k M^k over k = 0 .. n-1 (matrix powers; M is nilpotent on a DAG) or element-wise powers (thesis)."""
    n = M.shape[0]
    if power == "elementwise":
        return sum(np.power(M, k) for k in range(n))
    P, Mk = np.eye(n), np.eye(n)
    for _ in range(n):
        Mk = Mk @ M
        if not Mk.any():
            break
        P = P + Mk
    return P


def _col_normalize(X):
    s = X.sum(axis=0, keepdims=True)
    return np.divide(X, s, out=np.zeros_like(X), where=s != 0)


def _row_normalize(X):
    s = X.sum(axis=1, keepdims=True)
    return np.divide(X, s, out=np.zeros_like(X), where=s != 0)


def graph_entropy(dag, forward, power="matrix"):
    """Forward entropy H_f (eq. D7) or backward entropy H_b (eq. D5) of a DAG.

    H_b = 1/|mu| sum_{i in mu} sum_{k not maximal} P(k <- i) log k_in(k),  P(. <- i) = [sum (B^T)^k]_i.,
        B_ij = A_ij / k_in(j)
    H_f = 1/|M| sum_{i in M} sum_{k not minimal} P(i -> k) log k_out(k),   P(i -> .) = [sum B'^k]_i.,
        B'_ij = A_ij / k_out(i)
    With ``power="elementwise"`` this is the thesis code's computation (column-normalized B in both directions).
    """
    G = nx.convert_node_labels_to_integers(dag)
    A = nx.to_numpy_array(G, nodelist=range(len(G)), weight=None)
    maximal, minimal = max_min_layers(G, True), max_min_layers(G, False)
    if power == "elementwise":
        B = _col_normalize(A)
        P = _path_probabilities(B if forward else B.T, "elementwise")
        boundary = maximal if forward else minimal
        inner = set(G.nodes()) - set(minimal if forward else maximal)
        deg = G.out_degree if forward else G.in_degree
        h = sum(P[k][b] * np.log(deg(k)) for b in boundary for k in inner)
        return h / len(boundary)
    if forward:
        P = _path_probabilities(_row_normalize(A), "matrix")
        boundary, inner, deg = maximal, set(G.nodes()) - set(minimal), G.out_degree
    else:
        P = _path_probabilities(_col_normalize(A).T, "matrix")
        boundary, inner, deg = minimal, set(G.nodes()) - set(maximal), G.in_degree
    h = sum(P[b, k] * np.log(deg(k)) for b in boundary for k in inner)
    return h / len(boundary)


def _f(dag, power):
    """Eq. D8: f = (H_f - H_b) / max(H_f, H_b), 0 when both vanish."""
    if dag.number_of_edges() == 0:
        return 0.0
    hf, hb = graph_entropy(dag, True, power), graph_entropy(dag, False, power)
    if hf == 0 and hb == 0:
        return 0.0
    return (hf - hb) / max(hf, hb)


def treeness(dag, power="matrix", subgraphs="paper"):
    top = recursive_leaf_removal(dag, from_top=True)
    bottom = recursive_leaf_removal(dag, from_top=False)
    if subgraphs == "thesis":
        top = top[:-1] if len(top) > 1 else top
        bottom = bottom[:-1] if len(bottom) > 1 else bottom
        total = 0.0
        for seq in (top, bottom):
            for i in range(len(seq)):
                G = seq[i]
                total += 0.0 if (len(seq[i:]) == 1 and len(G.nodes()) == 1) else _f_thesis(G, power)
        return total / (len(top) + len(bottom))
    W = [dag] + [G for G in top[1:] + bottom[1:] if G.number_of_edges() > 0]  # eq. D9
    return float(np.mean([_f(G, power) for G in W]))


def _f_thesis(G, power):
    hf, hb = graph_entropy(G, True, power), graph_entropy(G, False, power)
    if hf == 0 and hb == 0:
        return 0.0
    return (hf - hb) / max(hf, hb)


# ---------------------------------------------------------------------------- weighted average

def hierarchy_coordinates(A, num_thresholds=8, exp_threshold_distribution=None, variant="corominas"):
    """(treeness, feedforwardness, orderability) of a weighted adjacency matrix, averaged over thresholds.

    Binary matrices use a single threshold. ``exp_threshold_distribution=0.5`` gives the thesis's exponential
    thresholds; None gives linear ones.
    """
    opts = VARIANTS[variant]
    A = np.asarray(A, dtype=float)
    if not A.any():
        return HierarchyCoordinates(0.0, 0.0, 0.0)
    if np.isin(A, (0.0, 1.0)).all():
        num_thresholds = 1
    condensed, _ = node_weighted_condense(A, num_thresholds, exp_threshold_distribution)
    t = np.mean([treeness(c, opts["power"], opts["subgraphs"]) for c in condensed])
    f = np.mean([feedforwardness(c) for c in condensed])
    o = np.mean([orderability(c) for c in condensed])
    return HierarchyCoordinates(float(t), float(f), float(o))
