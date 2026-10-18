"""B5: large-delta closed forms against the full SS model."""

import numpy as np
import pytest

from nichenet.continuum import large_delta as ld
from nichenet.core import graphs
from nichenet.ss import SSParams, run, schedules


def test_large_delta_distances_track_full_rwed_without_selection():
    """With proportional reward (phi = 0) all weights stay well above e^-delta, and trajectories under
    D = delta - ln T stay within 1e-3 of the full RWED model at delta = 10."""
    rng = np.random.default_rng(0)
    A0 = graphs.uniform_random(20, rng)
    src = schedules.markov(150, 20, 20.0, rng)
    full = run(A0, src, SSParams.clean(0.4, 0.0))["A"]
    approx = run(A0, src, SSParams.clean(0.4, 0.0, distance="large_delta"))["A"]
    assert np.abs(full - approx).max() < 1e-3


def test_large_delta_breaks_down_under_selection():
    """With a selective cut, unrewarded weights halve every step and drop below e^-delta, where two-hop paths
    set the distance. The one-hop formula then diverges from the RWED (documented limit of B5)."""
    rng = np.random.default_rng(0)
    A0 = graphs.uniform_random(20, rng)
    src = schedules.markov(150, 20, 20.0, rng)
    full = run(A0, src, SSParams.clean(0.4, 0.6))
    approx = run(A0, src, SSParams.clean(0.4, 0.6, distance="large_delta"))
    assert full["A"].min() < np.exp(-10.0)
    assert np.abs(full["A"] - approx["A"]).max() > 0.1


@pytest.mark.parametrize("kappa,T", [(0.2, 1.0), (0.5, 1.0), (0.3, 0.6), (0.6, 0.8), (0.0, 0.3)])
def test_tempered_fixed_point(kappa, T):
    n = 30
    rng = np.random.default_rng(1)
    out = run(graphs.uniform_random(n, rng), schedules.constant(400, 3),
              SSParams.clean(kappa, 0.0, selection="tempered", temperature=T))
    assert out["source_attention"][-1] == pytest.approx(ld.x_star(n, kappa, T), rel=2e-3)


def test_condensation_below_T_equals_kappa():
    n = 30
    rng = np.random.default_rng(2)
    out = run(graphs.uniform_random(n, rng), schedules.constant(400, 3),
              SSParams.clean(0.5, 0.0, selection="tempered", temperature=0.45))
    assert out["source_attention"][-1] > 0.99


def test_contraction_rate():
    n, kappa, T, eps = 30, 0.4, 0.8, 0.5
    xs = ld.x_star(n, kappa, T)
    h = 1e-7
    slope = (ld.symmetric_map(xs + h, n, kappa, T, eps=eps) - ld.symmetric_map(xs - h, n, kappa, T, eps=eps)) / (2 * h)
    assert slope == pytest.approx(ld.contraction(kappa, T, eps), rel=1e-5)


def test_T_half():
    n, kappa = 60, 0.2
    assert ld.x_star(n, kappa, ld.T_half(n, kappa)) == pytest.approx(0.5)
