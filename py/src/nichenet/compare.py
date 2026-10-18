"""E6: a 2 x 2 factorial between the source-to-structure model and adaptive transport networks.

All four cells run the same reward-memory update on the same graph and source schedule,
    W <- (1 - eta) W + eta * N[U(W, s)^p],
and differ only in
  * the budget N: "node" normalizes each node's in-weights (the SS attention budget); "global" normalizes the sum of
    all weights (the transport material budget);
  * the usage U of edge k -> i under the current source s: "rwed" is the SS info score D_k^(kappa-1) W_ki^kappa, with
    D_k the sender's random-walk effective distance from s (thesis source substitution D_s = min D / rho); kappa is
    the edge's self-reinforcement. "flux" is I_e^2, the squared
    Kirchhoff current on the undirected edge e = {k, i} when s broadcasts one unit to all other nodes, with
    conductance C_e = (W_ki + W_ik) / 2.

Corners:
  * node + rwed is exactly clean-mode SS with tempered selection, T = 1/p, the same kappa, eps = eta / (1 - eta).
  * global + flux has, under a constant source, Corson's optimum as its fixed point with gamma = 1/p - 1: currents are
    unchanged by a common scale of C, so normalizing sum C instead of sum C^gamma changes only the scale.
    Under a fluctuating source the reward memory averages N[(I^2)^p] over time, whereas Corson averages <I^2> before
    the power; the two orders differ.
"""

from dataclasses import dataclass

import networkx as nx
import numpy as np

from .core.linalg import row_normalize, rwed
from .transport.network import C_FLOOR

BUDGETS = ("node", "global")
USAGES = ("rwed", "flux")


@dataclass(frozen=True)
class Cell:
    budget: str
    usage: str
    p: float = 1.0
    eta: float = 0.05
    kappa: float = 0.0  # self-reinforcement in the rwed usage (the SS info-score exponent); flux has its own
    delta: float = 10.0
    rho: float = 2.6

    def __post_init__(self):
        if self.budget not in BUDGETS or self.usage not in USAGES:
            raise ValueError(f"unknown cell {self.budget}/{self.usage}")


class Substrate:
    """A graph shared by all cells: directed mask from an undirected edge list (both directions)."""

    def __init__(self, G):
        self.G = nx.convert_node_labels_to_integers(G)
        self.n = self.G.number_of_nodes()
        self.edges = np.array(list(self.G.edges()), dtype=np.int64)
        self.mask = np.zeros((self.n, self.n), dtype=bool)
        self.mask[self.edges[:, 0], self.edges[:, 1]] = True
        self.mask[self.edges[:, 1], self.edges[:, 0]] = True
        D = np.zeros((len(self.edges), self.n))
        D[np.arange(len(self.edges)), self.edges[:, 0]] = 1.0
        D[np.arange(len(self.edges)), self.edges[:, 1]] = -1.0
        self.incidence = D

    def initial(self, budget, rng, jitter=0.1):
        W = np.where(self.mask, 1.0 + jitter * rng.random((self.n, self.n)), 0.0)
        return normalize(W, budget, self.mask)

    # ---------------------------------------------------------------- usages

    def rwed_usage(self, W, s, cell):
        D, _ = rwed(row_normalize(W), cell.delta)
        d = D[s].copy()
        d[s] = np.delete(d, s).min() / cell.rho
        return np.where(self.mask, (d ** (cell.kappa - 1.0))[:, None] * np.power(W, cell.kappa), 0.0)

    def currents(self, W, s):
        """Edge currents for a broadcast from s (q_s = 1, q_k = -1/(n-1)), oriented along self.edges."""
        C = (W[self.edges[:, 0], self.edges[:, 1]] + W[self.edges[:, 1], self.edges[:, 0]]) / 2
        g = np.maximum(C, C_FLOOR * C.max())
        L = self.incidence.T @ (g[:, None] * self.incidence)
        q = np.full(self.n, -1.0 / (self.n - 1))
        q[s] = 1.0
        keep = np.arange(1, self.n)
        p = np.zeros(self.n)
        p[keep] = np.linalg.solve(L[np.ix_(keep, keep)], q[keep])
        return C * (self.incidence @ p)

    def flux_usage(self, W, s):
        I2 = self.currents(W, s) ** 2
        U = np.zeros((self.n, self.n))
        U[self.edges[:, 0], self.edges[:, 1]] = I2
        U[self.edges[:, 1], self.edges[:, 0]] = I2
        return U

    def usage(self, W, s, cell):
        return self.rwed_usage(W, s, cell) if cell.usage == "rwed" else self.flux_usage(W, s)

    # ---------------------------------------------------------------- dynamics

    def step(self, W, s, cell):
        R = normalize(np.where(self.mask, self.usage(W, s, cell) ** cell.p, 0.0), cell.budget, self.mask)
        return (1 - cell.eta) * W + cell.eta * R

    def run(self, W0, sources, cell):
        W = W0.copy()
        for s in sources:
            W = self.step(W, int(s), cell)
        return W

    # ---------------------------------------------------------------- structure

    def backbone(self, W, theta=0.1):
        """Directed edges k -> i with W_ki >= theta * (node i's strongest in-weight)."""
        col_max = np.where(self.mask, W, 0.0).max(axis=0, keepdims=True)
        return self.mask & (W >= theta * col_max) & (W > 0)

    def loops(self, W, theta=0.1):
        """Independent loops E - V + components of the undirected backbone."""
        B = self.backbone(W, theta)
        H = nx.Graph()
        H.add_nodes_from(range(self.n))
        k, i = np.nonzero(B)
        H.add_edges_from(zip(k.tolist(), i.tolist(), strict=True))
        return int(H.number_of_edges() - H.number_of_nodes() + nx.number_connected_components(H))

    def effective_edges(self, W):
        """exp(entropy) of the normalized directed weights: how many edges carry the weight. A global budget with strong
        concentration can collapse onto a handful of edges, where the backbone and dissipation are not meaningful."""
        w = W[self.mask]
        w = w[w > 0] / w.sum()
        return float(np.exp(-np.sum(w * np.log(w))))

    def spans(self, W, rel=1e-10):
        """True if edges with weight >= rel * max(W) still connect every node. False means the weight has collapsed
        onto part of the graph (or below numerical resolution), so loop counts and dissipation are not meaningful."""
        alive = self.mask & (W >= rel * W[self.mask].max())
        H = nx.Graph()
        H.add_nodes_from(range(self.n))
        k, i = np.nonzero(alive | alive.T)
        H.add_edges_from(zip(k.tolist(), i.tolist(), strict=True))
        return nx.is_connected(H)

    def mean_dissipation(self, W):
        """Mean over sources of the broadcast dissipation sum_e I_e^2 / C_e, with C scaled to sum 1."""
        C = (W[self.edges[:, 0], self.edges[:, 1]] + W[self.edges[:, 1], self.edges[:, 0]]) / 2
        Wn = W / C.sum()
        Cn = C / C.sum()
        total = 0.0
        for s in range(self.n):
            total += np.sum(self.currents(Wn, s) ** 2 / np.maximum(Cn, 1e-300))
        return float(total / self.n)


def normalize(X, budget, mask):
    X = np.where(mask, X, 0.0)
    if budget == "node":
        s = X.sum(axis=0, keepdims=True)
        return np.divide(X, s, out=np.zeros_like(X), where=s > 0)
    total = X.sum()
    return X / total if total > 0 else X
