"""B2/B3: the SS map as an Euler step of logit dynamics; fixed points shared with Sato-Crutchfield replicators."""

import numpy as np
import pytest

from nichenet.continuum import dynamics as dyn
from nichenet.continuum import large_delta as ld
from nichenet.core import graphs
from nichenet.ss import SSParams
from nichenet.ss.model import SourceToStructure


def setup(n=16, seed=0, kappa=0.3, T=0.8, eps=0.4):
    rng = np.random.default_rng(seed)
    A0 = graphs.uniform_random(n, rng)
    p = SSParams.clean(kappa, 0.0, selection="tempered", temperature=T, epsilon=eps)
    return A0, p, graphs.edge_mask(A0)


def test_ss_step_is_euler_step_of_logit_flow():
    A0, p, mask = setup()
    m = SourceToStructure(A0, p)
    m.step(2)
    h = p.epsilon / (1 + p.epsilon)
    np.testing.assert_allclose(m.A, A0 + h * dyn.logit_flow(A0, 2, p, mask), rtol=1e-12, atol=1e-15)


def test_fixed_point_equals_long_simulation():
    A0, p, mask = setup()
    W, _ = dyn.fixed_point(A0, 2, p, mask)
    m = SourceToStructure(A0, p)
    for _ in range(600):
        m.step(2)
    np.testing.assert_allclose(m.A, W, atol=1e-9)


def test_fixed_point_is_softmax_in_log_distance():
    """w_ki ∝ D_k^(-1/T_eff) with T_eff = (T - kappa)/(1 - kappa)."""
    A0, p, mask = setup()
    W, _ = dyn.fixed_point(A0, 2, p, mask)
    from nichenet.ss.model import source_distances
    d, _ = source_distances(W, 2, p)
    pred = np.where(mask, (d ** (-1 / dyn.T_eff(p.kappa, p.temperature)))[:, None], 0.0)
    pred /= pred.sum(axis=0, keepdims=True)
    np.testing.assert_allclose(W, pred, rtol=1e-8, atol=1e-12)


def test_sato_crutchfield_shares_the_fixed_point():
    A0, p, mask = setup()
    W, _ = dyn.fixed_point(A0, 2, p, mask)
    assert np.abs(dyn.sato_crutchfield_flow(W, 2, p, mask)).max() < 1e-10
    assert np.abs(dyn.sato_crutchfield_flow(A0, 2, p, mask)).max() > 1e-3


def test_symmetric_reduction_is_consistent_with_T_eff():
    """In the symmetric state u* = rho^(1/T_eff), the large-delta closed form."""
    kappa, T = 0.3, 0.8
    assert ld.u_star(kappa, T) == pytest.approx(2.6 ** (1 / dyn.T_eff(kappa, T)))


def test_ema_conversions():
    from nichenet.continuum import ema
    assert ema.beta_of_eps(1.0) == pytest.approx(0.5)
    assert ema.tau_m_of_eps(1.0) == pytest.approx(1 / np.log(2))
    assert ema.tau_m_of_beta(ema.beta_of_eps(0.3)) == pytest.approx(ema.tau_m_of_eps(0.3))
    assert ema.beta_eff(0.4) == pytest.approx(0.7)


def test_one_relay_half_point():
    from nichenet.continuum import one_relay
    n, g = 60, 0.5
    assert one_relay.x_star(n, g, one_relay.T_half(n, g)) == pytest.approx(0.5, abs=1e-9)
