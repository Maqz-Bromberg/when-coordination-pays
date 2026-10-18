"""Routing and diffusion efficiency (Goñi et al. 2013 morphospace) as computed in the 2020 thesis code.

Ported from ``reference/Networks_Via_Diffusion/efficiency_coordinates.py`` for networkx >= 3, keeping its
definitions:
  * shortest paths run on edge lengths 1 - T_ij (T = row-normalized A, exact zeros replaced by 1e-100), so every
    ordered pair is joined by an edge and absent edges have length 1;
  * E_rout = sum_{i,j} 1 / (SP_ij + 1/n) / (n(n-1)); the diagonal (SP = 0) is included, contributing n each;
  * E_diff = sum_{i,j} RWED_ij(delta = 1) / (n(n-1));
  * normalized values are (E - E_lattice) / (E_random - E_lattice) with a periodic 2 x n/2 lattice and ten
    seeded directed G(n, 1/2) graphs.
"""

import networkx as nx
import numpy as np

from ..core.linalg import row_normalize, rwed


def shortest_path_distances(A, reversed_directions=False):
    L = 1.0 - row_normalize(np.asarray(A, dtype=float))
    L = np.where(L == 0, 1e-100, L)
    G = nx.from_numpy_array(L, create_using=nx.DiGraph)
    if reversed_directions:
        G = G.reverse(copy=False)
    lengths = dict(nx.all_pairs_dijkstra_path_length(G, weight="weight"))
    n = L.shape[0]
    # The thesis code sums edge lengths along each Dijkstra path and stores SP[t][s] (transposed).
    return np.array([[lengths[s].get(t, np.inf) for s in range(n)] for t in range(n)])


def _lattice_and_random(n, efficiency_fn, ensemble_size=10):
    lattice = row_normalize(nx.to_numpy_array(nx.grid_graph(dim=[2, int(n / 2)], periodic=True)))
    rnd = [row_normalize(nx.to_numpy_array(nx.fast_gnp_random_graph(n=n, p=0.5, seed=i, directed=True)))
           for i in range(ensemble_size)]
    return efficiency_fn(lattice, normalize=False), float(np.mean([efficiency_fn(R, normalize=False) for R in rnd]))


def E_rout(A, reversed_directions=False, normalize=True):
    n = A.shape[0]
    base = np.sum(1.0 / (shortest_path_distances(A, reversed_directions) + 1.0 / n)) / (n * (n - 1))
    if not normalize:
        return float(base)
    lat, rnd = _lattice_and_random(n, E_rout)
    return float((base - lat) / (rnd - lat))


def E_diff(A, normalize=True):
    n = A.shape[0]
    D, _ = rwed(row_normalize(np.asarray(A, dtype=float)), 1.0)
    base = np.sum(D) / (n * (n - 1))
    if not normalize:
        return float(base)
    lat, rnd = _lattice_and_random(n, E_diff)
    return float((base - lat) / (rnd - lat))


def network_efficiencies(A, normalize=True):
    return E_diff(A, normalize=normalize), E_rout(A, normalize=normalize)
