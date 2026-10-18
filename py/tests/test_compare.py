"""E6 factorial: its two corners reproduce the SS model and Corson's optimum."""

import networkx as nx
import numpy as np
import pytest

from nichenet import compare
from nichenet.ss import SSParams, run, schedules
from nichenet.transport import network as tn


@pytest.fixture(scope="module")
def sub():
    return compare.Substrate(nx.grid_2d_graph(5, 5))


@pytest.mark.parametrize("kappa", [0.0, 0.4])
def test_node_rwed_corner_is_clean_tempered_ss(sub, kappa):
    rng = np.random.default_rng(0)
    W0 = sub.initial("node", rng)
    src = schedules.markov(60, sub.n, 10.0, rng)
    p, eta = 2.0, 0.2
    W = sub.run(W0, src, compare.Cell("node", "rwed", p=p, eta=eta, kappa=kappa))
    ref = run(W0, src, SSParams.clean(kappa, 0.0, selection="tempered", temperature=1 / p, epsilon=eta / (1 - eta)))
    np.testing.assert_allclose(W, ref["A"], rtol=1e-9, atol=1e-13)


def _corson(sub, s):
    net = tn.FlowNetwork(sub.n, sub.edges, np.ones(len(sub.edges)))
    q = np.full((sub.n, 1), -1.0 / (sub.n - 1))
    q[s] = 1.0
    return net, ("samples", q)


def test_global_flux_corner_reaches_unique_corson_optimum(sub):
    """gamma = 1/p - 1 > 1: Corson's optimum is unique, and the constant-source fixed point equals it (up to scale)."""
    p, s = 0.4, 7
    W = sub.run(sub.initial("global", np.random.default_rng(1)), np.full(3000, s),
                compare.Cell("global", "flux", p=p, eta=0.3))
    C = W[sub.edges[:, 0], sub.edges[:, 1]]
    net, loads = _corson(sub, s)
    C_opt, _ = net.optimize(1 / p - 1, loads, C0=np.ones(len(sub.edges)))
    np.testing.assert_allclose(C / C.max(), C_opt / C_opt.max(), atol=1e-6)


def test_global_flux_tree_is_a_corson_fixed_point(sub):
    """gamma < 1: local minima depend on the start, but the factorial's end state is a fixed point of Corson's map."""
    p, s = 0.8, 7
    W = sub.run(sub.initial("global", np.random.default_rng(1)), np.full(4000, s),
                compare.Cell("global", "flux", p=p, eta=0.3))
    C = W[sub.edges[:, 0], sub.edges[:, 1]]
    net, loads = _corson(sub, s)
    C_next, _ = net.optimize(1 / p - 1, loads, C0=C, iters=1)
    np.testing.assert_allclose(C_next / C_next.max(), C / C.max(), atol=1e-6)
    assert sub.loops(W) == 0


def test_currents_conserve_flow(sub):
    rng = np.random.default_rng(2)
    W = sub.initial("node", rng)
    currents = sub.currents(W, 3)
    q = np.full(sub.n, -1.0 / (sub.n - 1))
    q[3] = 1.0
    np.testing.assert_allclose(sub.incidence.T @ currents, q, atol=1e-10)


def test_loops_of_full_lattice(sub):
    rng = np.random.default_rng(3)
    assert sub.loops(sub.initial("node", rng), theta=0.0) == 16  # (5 - 1)^2 faces
