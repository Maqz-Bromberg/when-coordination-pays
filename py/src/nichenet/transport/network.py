"""Linear flow networks: Kirchhoff solves, load ensembles, optimal and adaptive conductances.

An undirected graph with edges e = (u_e, w_e), lengths l_e and conductances C_e. For a load vector q (sum 0,
q_k > 0 injects), potentials solve L p = q with L = D^T diag(C / l) D, and edge currents are
I_e = (C_e / l_e)(p_u - p_w). Dissipation P = sum_e I_e^2 l_e / C_e (Katifori et al. 2010 eq. 3 with l = 1).

Optimal networks (Corson 2010 eq. 6; Katifori et al. 2010 eqs. 1-5): minimizing <P> over the load ensemble
subject to sum_e C_e^gamma = K^gamma gives the fixed point
    C_e = <I_e^2>^(1/(1+gamma)) / (sum_m <I_m^2>^(gamma/(1+gamma)))^(1/gamma) * K,
iterated from an initial C (local minima depend on it for gamma < 1).

Adaptation (Ronellenfitsch & Katifori 2016 eq. 4, generalizing Hu & Cai 2013): dC_e/dt = a (|F_e| / F_hat)^(2 g) -
b C_e + c, with F_e^2 replaced by the ensemble mean <I_e^2>. Its c = 0 steady state is C ∝ <I^2>^g, the optimum
above for g = 1/(1 + gamma). g = 1/2 is the linear-flux form of the Physarum model of Tero et al.
"""

from dataclasses import dataclass

import networkx as nx
import numpy as np

C_FLOOR = 1e-12  # relative floor on conductances inside the Laplacian, keeps it non-singular as edges vanish


@dataclass
class FlowNetwork:
    n: int
    edges: np.ndarray  # (E, 2) int
    lengths: np.ndarray  # (E,)
    pos: np.ndarray | None = None  # (n, 2) node coordinates, for plotting

    @classmethod
    def from_networkx(cls, G, length_attr=None):
        nodes = list(G.nodes())
        index = {v: i for i, v in enumerate(nodes)}
        edges = np.array([(index[u], index[w]) for u, w in G.edges()], dtype=np.int64)
        lengths = (np.array([G.edges[e].get(length_attr, 1.0) for e in G.edges()]) if length_attr
                   else np.ones(len(edges)))
        pos = None
        if all("pos" in G.nodes[v] for v in nodes):
            pos = np.array([G.nodes[v]["pos"] for v in nodes], dtype=float)
        elif all(isinstance(v, tuple) and len(v) == 2 for v in nodes):
            pos = np.array(nodes, dtype=float)
        return cls(len(nodes), edges, lengths, pos)

    @property
    def n_edges(self):
        return len(self.edges)

    def incidence(self):
        D = np.zeros((self.n_edges, self.n))
        D[np.arange(self.n_edges), self.edges[:, 0]] = 1.0
        D[np.arange(self.n_edges), self.edges[:, 1]] = -1.0
        return D

    # ------------------------------------------------------------------ flows

    def currents(self, C, Q, ground=0):
        """Edge currents (E, m) for load vectors Q (n, m) whose columns sum to zero."""
        D = self.incidence()
        g = np.maximum(C, C_FLOOR * C.max()) / self.lengths
        L = D.T @ (g[:, None] * D)
        keep = np.delete(np.arange(self.n), ground)
        p = np.zeros((self.n, Q.shape[1]))
        p[keep] = np.linalg.solve(L[np.ix_(keep, keep)], Q[keep])
        return (C / self.lengths)[:, None] * (D @ p)

    def response(self, C, ground=0):
        """Matrix G (E, n) with I = G q for any balanced load q."""
        D = self.incidence()
        g = np.maximum(C, C_FLOOR * C.max()) / self.lengths
        L = D.T @ (g[:, None] * D)
        keep = np.delete(np.arange(self.n), ground)
        Linv = np.zeros((self.n, self.n))
        Linv[np.ix_(keep, keep)] = np.linalg.inv(L[np.ix_(keep, keep)])
        return (C / self.lengths)[:, None] * (D @ Linv)

    def mean_square_currents(self, C, loads):
        """<I_e^2> over a load ensemble: ("samples", Q) with equally weighted columns, or ("moments", S) with the
        second-moment matrix S = <q q^T>."""
        kind, X = loads
        if kind == "samples":
            return np.mean(self.currents(C, X) ** 2, axis=1)
        if kind == "moments":
            G = self.response(C)
            return np.maximum(np.einsum("en,nm,em->e", G, X, G), 0.0)  # clip rounding below zero
        raise ValueError(kind)

    def dissipation(self, C, loads):
        return float(np.sum(self.mean_square_currents(C, loads) * self.lengths / np.maximum(C, 1e-300)))

    # ------------------------------------------------------------------ optimization and adaptation

    def optimize(self, gamma, loads, C0=None, K=1.0, rng=None, iters=30000, tol=1e-12):
        """Corson's fixed-point iteration for local minima of <P> at fixed sum C^gamma = K^gamma."""
        rng = np.random.default_rng() if rng is None else rng
        C = rng.uniform(0.5, 1.5, self.n_edges) if C0 is None else np.asarray(C0, float).copy()
        C = C / np.sum(C ** gamma) ** (1 / gamma) * K
        done = 0
        while done < iters:
            I2 = self.mean_square_currents(C, loads)
            new = I2 ** (1 / (1 + gamma))
            new = new / np.sum(new ** gamma) ** (1 / gamma) * K
            change = np.max(np.abs(new - C)) / np.max(new)
            C = new
            done += 1
            if change < tol:
                break
        return C, done

    def adapt(self, loads, g=0.5, a=1.0, b=1.0, c=0.0, F_hat=1.0, C0=None, dt=0.05, steps=4000, rng=None):
        """Explicit-Euler integration of dC/dt = a (<I^2>/F_hat^2)^g - b C + c."""
        rng = np.random.default_rng() if rng is None else rng
        C = rng.uniform(0.5, 1.5, self.n_edges) if C0 is None else np.asarray(C0, float).copy()
        for _ in range(steps):
            I2 = self.mean_square_currents(C, loads)
            C = np.maximum(C + dt * (a * (I2 / F_hat ** 2) ** g - b * C + c), 0.0)
        return C

    # ------------------------------------------------------------------ structure

    def loops(self, C, rel_threshold=1e-6):
        """Number of independent loops E - V + components over edges with C > threshold * max C (Corson 2010)."""
        keep = C > rel_threshold * C.max()
        G = nx.Graph()
        G.add_nodes_from(range(self.n))
        G.add_edges_from(map(tuple, self.edges[keep]))
        G.remove_nodes_from([v for v in list(G.nodes()) if G.degree(v) == 0])
        return int(G.number_of_edges() - G.number_of_nodes() + nx.number_connected_components(G))

    def directed_by_flow(self, C, loads, rel_threshold=1e-6):
        """Weighted directed adjacency A[k, i] = C_e for edges oriented along the mean current, so transport
        networks can be compared with SS networks (e.g. hierarchy coordinates). Edges below threshold are dropped."""
        kind, X = loads
        if kind == "samples":
            mean_I = self.currents(C, X).mean(axis=1)
        else:
            raise ValueError("orientation needs load samples")
        A = np.zeros((self.n, self.n))
        for (u, w), c, i in zip(self.edges, C, mean_I, strict=True):
            if c <= rel_threshold * C.max():
                continue
            if i >= 0:
                A[u, w] = c
            else:
                A[w, u] = c
        return A


# ---------------------------------------------------------------------- graphs and load ensembles

def lattice(n):
    """n x n square lattice (Corson 2010)."""
    return FlowNetwork.from_networkx(nx.grid_2d_graph(n, n))


def triangular(m, n):
    """Triangular lattice with m rows and n columns of triangles (leaf-like, Katifori et al. 2010)."""
    G = nx.triangular_lattice_graph(m, n)
    return FlowNetwork.from_networkx(G)


def steady_loads(n, root=0):
    """Katifori's homogeneous load: the root injects n - 1, every other node draws 1."""
    q = -np.ones((n, 1))
    q[root] = n - 1
    return ("samples", q)


def moving_sink_loads(n, root=0):
    """Katifori's fluctuating load: unit source at the root and a single sink a, one column per a != root."""
    others = [a for a in range(n) if a != root]
    Q = np.zeros((n, len(others)))
    Q[root] = 1.0
    Q[others, np.arange(len(others))] = -1.0
    return ("samples", Q)


def corson_moments(n, sigma, sink=0):
    """Corson's ensemble: sink at one node, the others are sources with <i_k> = 1 and
    <i_k i_l> = 1 + sigma^2 delta_kl; the sink balances them. Returns the second-moment matrix of q."""
    src = np.delete(np.arange(n), sink)
    S_src = np.ones((n - 1, n - 1)) + sigma ** 2 * np.eye(n - 1)
    # q = P i with P mapping source currents to all nodes (sink gets -sum)
    P = np.zeros((n, n - 1))
    P[src, np.arange(n - 1)] = 1.0
    P[sink, :] = -1.0
    return ("moments", P @ S_src @ P.T)


def schedule_loads(n, sources, root=0):
    """Load samples from an SS-style source schedule: unit injection at the root and unit draw at each scheduled
    node (the scheduled 'source' in SS plays the moving terminal). Steps where the terminal is the root are skipped."""
    s = np.asarray(sources)
    s = s[s != root]
    Q = np.zeros((n, s.size))
    Q[root] = 1.0
    Q[s, np.arange(s.size)] = -1.0
    return ("samples", Q)
