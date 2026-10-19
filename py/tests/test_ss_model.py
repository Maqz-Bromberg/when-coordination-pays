"""Properties of the SS model in docs/results.md and docs/errata.md (B1, B5, quirks), checked on nichenet itself."""

import numpy as np
import pytest

from nichenet.core import graphs
from nichenet.core.linalg import row_normalize, rwed, rwed_large_delta
from nichenet.ss import SSParams, run, schedules
from nichenet.ss.model import SourceToStructure


def test_update_is_average_with_increment_epsilon():
    rng = np.random.default_rng(0)
    A0 = graphs.uniform_random(12, rng, normalize="cols")
    for eps in (1.0, 0.25):
        m = SourceToStructure(A0, SSParams.clean(0.4, 0.5, epsilon=eps))
        A_before = m.A.copy()
        m.step(3)
        r = ((1 + eps) * m.A - A_before) / eps
        assert (r > -1e-12).all()
        np.testing.assert_allclose(r.sum(axis=0), 1.0)


def test_rwed_large_delta_expansion():
    rng = np.random.default_rng(1)
    T = row_normalize(graphs.uniform_random(20, rng))
    D, _ = rwed(T, 10.0)
    off = ~np.eye(20, dtype=bool)
    assert np.abs(D - rwed_large_delta(T, 10.0))[off].max() < 1e-2


@pytest.mark.parametrize("n", [20, 60])
@pytest.mark.parametrize("kappa", [0.2, 0.5, 0.8])
@pytest.mark.parametrize("mode", ["faithful", "clean"])
def test_proportional_fixed_point(n, kappa, mode):
    """B5: phi = 0, constant source -> source attention rho / (rho + N - 2), independent of kappa."""
    rng = np.random.default_rng(2)
    p = getattr(SSParams, mode)(kappa, 0.0)
    A0 = graphs.uniform_random(n, rng, normalize="rows" if mode == "faithful" else "cols")
    out = run(A0, schedules.constant(250, 3), p)
    assert out["source_attention"][-1] == pytest.approx(2.6 / (2.6 + n - 2), rel=1e-3)


def test_kappa_zero_rewires_only_in_faithful_mode():
    rng = np.random.default_rng(3)
    A0 = graphs.sparse_random(15, 3, rng, normalize="cols")
    src = schedules.random(5, 15, rng)
    faithful = run(A0, src, SSParams.faithful(0.0, 0.0))["A"]
    clean = run(A0, src, SSParams.clean(0.0, 0.0))["A"]
    assert (faithful > 0).sum() == 15 * 15 and faithful.diagonal().sum() > 0
    assert ((clean > 0) <= (A0 > 0)).all() and clean.diagonal().sum() == 0


def test_rank_over_in_neighbours_removes_sparse_threshold():
    """On a sparse graph, phi = 0.5 < 1 - k/N cuts nothing when ranking all N entries, but halves the
    rewarded in-edges when ranking in-neighbours only."""
    rng = np.random.default_rng(4)
    n, k = 20, 6
    A0 = graphs.sparse_random(n, k, rng, normalize="cols")
    mask = graphs.edge_mask(A0)
    frac = {}
    for name, p in (("all", SSParams.clean(0.5, 0.5, rank_over="all")), ("in", SSParams.clean(0.5, 0.5))):
        m = SourceToStructure(A0, p)
        before = m.A.copy()
        m.step(1)
        r = 2 * m.A - before
        frac[name] = ((r > 1e-12) & mask).sum() / mask.sum()
    assert frac["all"] > 0.95
    assert frac["in"] < 0.7


def test_schedules():
    rng = np.random.default_rng(5)
    s = schedules.shifts(25, 60, 10, rng)
    assert len(np.unique(s)) == 13  # int(25 / 10) = 2 -> a new source every 2 steps, including t = 0
    m = schedules.markov(20000, 10, 50.0, rng)
    assert np.mean(m[1:] != m[:-1]) == pytest.approx(1 / 50, rel=0.15)
    pl = schedules.power_law(5000, 60, 5.0, rng)
    assert pl.min() >= 0 and pl.max() <= 59 and np.median(pl) > 45
