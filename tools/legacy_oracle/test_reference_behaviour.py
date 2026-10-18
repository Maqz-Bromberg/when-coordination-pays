"""Checks of how the reference thesis code behaves, backing the claims in PLAN.md §0 and §2.3/§2.5.

Run with:  conda run -n nvd-legacy pytest -q tools/legacy_oracle
"""
import numpy as np
import pytest
from shim import SOURCE_REWARD, efficiency_coordinates, graph, step

N = 20
SOURCE = 3


def warmed_up(kappa, phi, init="uniform", k=3):
    """Graph after one update, so that in-weight (columns) is normalized (initialization normalizes rows)."""
    np.random.seed(0)
    G = graph.Graph(N, edge_conservation_coefficient=kappa, selectivity=phi)
    G.uniform_random_edge_init() if init == "uniform" else G.sparse_random_edge_init(k)
    step(G, SOURCE)
    return G


def test_initialization_normalizes_rows_not_columns():
    np.random.seed(0)
    G = graph.Graph(N, edge_conservation_coefficient=0.5, selectivity=0.0)
    G.uniform_random_edge_init()
    A0 = G.A[-1]
    assert np.allclose(A0.sum(1), 1) and not np.allclose(A0.sum(0), 1)


@pytest.mark.parametrize("kappa,phi", [(0.5, 0.0), (0.2, 0.8)])
def test_update_is_average_with_unit_increment(kappa, phi):
    """Each step is A_col <- (A_col + r)/2 with r a distribution, i.e. epsilon = 1, beta = 1/2."""
    G = warmed_up(kappa, phi)
    A0, A1 = step(G, SOURCE)
    r = 2 * A1 - A0
    assert np.allclose(A0.sum(0), 1)
    assert (r > -1e-12).all()
    assert np.allclose(r.sum(0), 1)


def test_kappa_zero_reinforces_non_edges_and_self_loops():
    """pow(0, 0) == 1, so at kappa = 0 every entry, including the diagonal, gets a positive score."""
    np.random.seed(0)
    G = graph.Graph(N, edge_conservation_coefficient=0.0, selectivity=0.0)
    G.sparse_random_edge_init(3)
    A0, A1 = step(G, SOURCE)
    assert A0.diagonal().sum() == 0 and A1.diagonal().sum() > 0
    assert (A0 > 0).sum() < N * N and (A1 > 0).sum() == N * N


@pytest.mark.parametrize("phi,expect_all_rewarded", [(0.5, True), (0.9, False)])
def test_rank_cut_counts_all_n_entries(phi, expect_all_rewarded):
    """The cut sorted(score)[int(phi*N)] includes non-edges, so below phi = 1 - k/N every in-edge is rewarded."""
    k = 3
    G = warmed_up(0.5, phi, init="sparse", k=k)
    A0, A1 = step(G, SOURCE)
    r = 2 * A1 - A0
    edges = A0 > 0
    frac_rewarded = ((r > 1e-12) & edges).sum(0) / np.maximum(edges.sum(0), 1)
    assert phi < 1 - k / N if expect_all_rewarded else phi > 1 - k / N
    if expect_all_rewarded:
        assert frac_rewarded.mean() > 0.95
    else:
        assert frac_rewarded.mean() < 0.85


def test_source_zero_means_random_seeding():
    np.random.seed(0)
    G = graph.Graph(N, edge_conservation_coefficient=0.5, selectivity=0.0)
    G.uniform_random_edge_init()
    G.simulate(num_runs=30, eff_dist_delta_param=10.0, constant_source_node=0, equilibrium_distance=0)
    assert len(set(G.source_node_history)) > 1


def test_rwed_large_delta_expansion():
    """At delta = 10 the RWED from s is delta - ln T_sj up to O(e^-delta); at delta = 1 it is not."""
    rng = np.random.default_rng(0)
    A = rng.random((N, N))
    np.fill_diagonal(A, 0)
    A /= A.sum(0)
    T = A / A.sum(1, keepdims=True)
    mask = np.arange(N) != SOURCE
    err = {}
    for delta in (1.0, 10.0):
        D = efficiency_coordinates.Random_Walker_Effective_Distance(T, source=SOURCE, parameter=delta)
        err[delta] = np.abs(D[mask] - (delta - np.log(T[SOURCE][mask]))).max()
    assert err[10.0] < 1e-2 < err[1.0]


@pytest.mark.parametrize("n_nodes", [20, 60])
@pytest.mark.parametrize("kappa", [0.2, 0.5, 0.8])
def test_proportional_reward_fixed_point_and_memory(n_nodes, kappa):
    """Large-delta reduction (PLAN.md B5): with phi = 0 and a constant source, attention on the source edge
    converges to rho/(rho + N - 2) for every kappa, at a linear rate close to (1 + kappa)/2."""
    np.random.seed(1)
    G = graph.Graph(n_nodes, edge_conservation_coefficient=kappa, selectivity=0.0)
    G.uniform_random_edge_init()
    G.simulate(num_runs=300, eff_dist_delta_param=10.0, constant_source_node=SOURCE, equilibrium_distance=0)
    x = np.array([np.delete(A[SOURCE], SOURCE).mean() for A in G.A])
    rho = SOURCE_REWARD
    assert x[-1] == pytest.approx(rho / (rho + n_nodes - 2), rel=1e-3)

    dev = np.abs(x[2:] - x[-1])
    dev = dev[dev > 1e-9][:60]
    rate = np.exp(np.polyfit(np.arange(len(dev)), np.log(dev), 1)[0])
    assert rate == pytest.approx((1 + kappa) / 2, abs=0.06)
