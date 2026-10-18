"""V-TR1-3: adaptive and optimal transport networks reproduce the published qualitative results."""

import networkx as nx
import numpy as np
import pytest

from nichenet.transport import network as tn


def two_route_network():
    """s = 0 to t = 3 by a short route 0-1-3 (length 2) or a long one 0-2-4-3 (length 3)."""
    G = nx.Graph()
    G.add_nodes_from(range(5))
    for u, w in [(0, 1), (1, 3), (0, 2), (2, 4), (4, 3)]:
        G.add_edge(u, w, l=1.0)
    return tn.FlowNetwork.from_networkx(G, "l")


def test_physarum_adaptation_finds_shortest_path():
    """V-TR1: the linear-flux (Tero et al.) adaptation keeps the shortest route and prunes the other."""
    net = two_route_network()
    q = np.zeros((5, 1))
    q[0], q[3] = 1.0, -1.0
    C = net.adapt(("samples", q), g=0.5, steps=3000, rng=np.random.default_rng(0))
    edge_C = {tuple(sorted(e)): c for e, c in zip(net.edges.tolist(), C, strict=True)}
    assert edge_C[(0, 1)] == pytest.approx(1.0, abs=1e-3) and edge_C[(1, 3)] == pytest.approx(1.0, abs=1e-3)
    assert max(edge_C[(0, 2)], edge_C[(2, 4)], edge_C[(3, 4)]) < 1e-3


@pytest.mark.parametrize("gamma", [0.25, 0.5, 0.9])
def test_steady_load_optima_are_trees(gamma):
    """V-TR3 / Corson (2010): with stationary sources every local minimum is a spanning tree for gamma < 1."""
    n = 7
    net = tn.lattice(n)
    for seed in range(2):
        C, _ = net.optimize(gamma, tn.corson_moments(n * n, 0.0), rng=np.random.default_rng(seed), iters=3000)
        assert net.loops(C) == 0


def test_convex_cost_keeps_every_edge():
    """V-TR3: for gamma > 1 the single global minimum has all edges non-zero."""
    n = 7
    net = tn.lattice(n)
    C, _ = net.optimize(1.5, tn.corson_moments(n * n, 0.0), rng=np.random.default_rng(0))
    assert net.loops(C) == (n - 1) ** 2


def test_fluctuations_create_loops_that_grow_with_gamma():
    """V-TR2 / Corson (2010) Fig. 2a: with strong source fluctuations loops appear and multiply as gamma -> 1."""
    n = 7
    net = tn.lattice(n)
    loops = [net.loops(net.optimize(g, tn.corson_moments(n * n, 3.0), rng=np.random.default_rng(0), iters=4000)[0])
             for g in (0.25, 0.5, 0.75, 0.9)]
    assert loops[0] < loops[1] < loops[2] < loops[3]
    assert loops[-1] > (n - 1) ** 2 // 2


def test_moving_sink_creates_loops():
    """V-TR2 / Katifori et al. (2010): a single moving sink gives looped optima where the steady load gives trees."""
    tri = tn.triangular(5, 6)
    for gamma in (0.5, 0.9):
        steady, _ = tri.optimize(gamma, tn.steady_loads(tri.n), rng=np.random.default_rng(1), iters=3000)
        moving, _ = tri.optimize(gamma, tn.moving_sink_loads(tri.n), rng=np.random.default_rng(1), iters=3000)
        assert tri.loops(steady) == 0
        assert tri.loops(moving) > 0


def test_adaptation_steady_state_matches_optimum():
    """Ronellenfitsch & Katifori eq. 4 with c = 0: steady state C ∝ <I^2>^g, the Corson optimum for
    g = 1/(1 + gamma) (up to normalization) when started from the same conductances."""
    net = tn.lattice(5)
    loads = tn.corson_moments(25, 3.0)
    gamma = 1.5  # unique optimum, so both routes must agree
    C_opt, _ = net.optimize(gamma, loads, rng=np.random.default_rng(0))
    C_ad = net.adapt(loads, g=1 / (1 + gamma), steps=6000, dt=0.05, rng=np.random.default_rng(0))
    np.testing.assert_allclose(C_ad / np.sum(C_ad ** gamma) ** (1 / gamma), C_opt, rtol=1e-3)


def test_flow_conservation():
    net = tn.triangular(4, 5)
    C = np.random.default_rng(2).uniform(0.1, 1.0, net.n_edges)
    _, Q = tn.moving_sink_loads(net.n)
    I = net.currents(C, Q)
    np.testing.assert_allclose(net.incidence().T @ I, Q, atol=1e-10)
