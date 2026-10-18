"""A1-A4: finer analysis of the tempered SS map."""

import numpy as np
import pytest

from nichenet.continuum import analysis as an
from nichenet.continuum import dynamics as dyn
from nichenet.continuum import large_delta as ld
from nichenet.core import graphs
from nichenet.ss import SSParams, run, schedules


def fixed(n=10, kappa=0.3, T=0.6, seed=0):
    rng = np.random.default_rng(seed)
    A0 = graphs.uniform_random(n, rng)
    mask = graphs.edge_mask(A0)
    p = SSParams.clean(kappa, 0.0, selection="tempered", temperature=T)
    W, _ = dyn.fixed_point(A0, 0, p, mask, damping=0.5, max_iter=200000)
    return W, p, mask


@pytest.mark.parametrize("delta", [1.0, 10.0])
def test_symmetric_reduction_is_exact_at_any_delta(delta):
    """A1: on a complete graph with a constant source the fixed point is the closed form for any delta."""
    n, kappa, T = 12, 0.3, 0.6
    rng = np.random.default_rng(1)
    p = SSParams.clean(kappa, 0.0, selection="tempered", temperature=T, delta=delta)
    A = run(graphs.uniform_random(n, rng), schedules.constant(600, 0), p)["A"]
    assert np.delete(A[0], 0).mean() == pytest.approx(ld.x_star(n, kappa, T), rel=1e-9)


def test_piece_spectrum_bulk_and_radius():
    """A2: the anchored piece has its bulk at (1 + eps kappa/T)/(1 + eps) and spectral radius < 1 for T > kappa."""
    W, p, mask = fixed()
    ev = an.tangent_jacobian(W, 0, p, mask, anchor=1)
    bulk = ld.contraction(p.kappa, p.temperature)
    assert np.sum(np.isclose(ev, bulk, atol=1e-6)) > len(ev) // 2
    assert ev[0] < 1.0 and ev[0] == pytest.approx(bulk, abs=0.01)


def test_symmetric_mode_contracts_at_bulk_rate():
    """A2: the collective mode (everyone shifts attention to the source equally) contracts at the bulk rate."""
    W, p, mask = fixed()
    n = W.shape[0]
    v = np.zeros_like(W)
    v[0, 1:] = 1.0
    for i in range(1, n):
        v[[k for k in range(1, n) if k != i], i] = -1.0 / (n - 2)
    h = 1e-6
    Jv = (an.ss_map(W + h * v, 0, p, mask) - an.ss_map(W - h * v, 0, p, mask)) / (2 * h)
    np.testing.assert_allclose(Jv[0, 1:], ld.contraction(p.kappa, p.temperature) * v[0, 1:], rtol=1e-5)


def test_separatrix_limit_is_one_step_criterion():
    """A3: as T -> 0 the separatrix ratio is rho^((1 - kappa)/kappa), i.e. (w_q/w_s)^kappa > rho^(1 - kappa)."""
    kappa = 0.6
    assert an.separatrix_ratio(kappa, 1e-12) == pytest.approx(2.6 ** ((1 - kappa) / kappa))
    assert an.separatrix_ratio(kappa, 0.7) == np.inf


def test_separatrix_predicts_lock_in():
    """A3: node-level lock-in under tempered selection below kappa follows the separatrix."""
    n, kappa, T = 20, 0.5, 0.2
    agree = []
    for seed in range(3):
        rng = np.random.default_rng(seed)
        A0 = graphs.uniform_random(n, rng)
        A = run(A0, schedules.constant(600, 0), SSParams.clean(kappa, 0.0, selection="tempered", temperature=T))["A"]
        for i in range(1, n):
            col = A0[:, i].copy()
            ws = col[0]
            col[[0, i]] = -1
            predicted = col.max() / ws > an.separatrix_ratio(kappa, T)
            locked = int(np.argmax(np.where(np.arange(n) == i, -1, A[:, i]))) != 0
            agree.append(predicted == locked)
    assert np.mean(agree) > 0.95


def test_noisy_mean_field_reduces_to_closed_form():
    """A4: with nu = 0 the averaged map has the closed-form fixed point."""
    n, kappa, T = 20, 0.2, 0.45
    roots = [x for x, stable in an.noisy_fixed_points(n, kappa, T, 0.0) if stable]
    assert roots == [pytest.approx(ld.x_star(n, kappa, T), rel=1e-6)]
