"""Niche-learning model against Lee et al.'s reference eigenfunction solver (tools/lee_oracle/make_golden.py)."""

import numpy as np
import pytest

from nichenet.nl import NLParams
from nichenet.nl.eigen import StationarySolver, chebyshev_fit, chebyshev_min, lobatto_beta, mean_kl_curve

GOLDEN_CASES = 6


@pytest.fixture(scope="module")
def nl_golden():
    from conftest import GOLDEN
    return np.load(GOLDEN / "nl_eigen.npz")


def params_for(g, i):
    kind, tau = str(g[f"kind_{i}"]), float(g[f"tau_{i}"])
    alpha = {"passive": 0.0, "stabilizer": -float(g["weight"]), "destabilizer": float(g["weight"])}[kind]
    v = 0.1 if kind == "passive" else float(np.sqrt(abs(float(g[f"v_{i}"]))))
    return NLParams(tau_E=tau, h0=float(g["h0"]), tau_c=int(g["nbatch"]), alpha=alpha, v=v)


@pytest.mark.parametrize("i", range(GOLDEN_CASES))
def test_eigen_matches_reference(nl_golden, i):
    p = params_for(nl_golden, i)
    d, errs = mean_kl_curve(p, nl_golden["betas"])
    np.testing.assert_allclose(d, nl_golden[f"dkl_{i}"], rtol=1e-8, err_msg=str(p))
    np.testing.assert_allclose(errs, nl_golden[f"errs_{i}"], rtol=1e-6, atol=1e-12)


def test_code_parameter_mapping():
    stab = NLParams(tau_E=10, alpha=-0.95, v=0.1)
    assert stab.code_v == pytest.approx(0.01) and stab.code_weight == pytest.approx(0.95)
    assert NLParams(tau_E=10, alpha=0.95, v=0.1).code_v == pytest.approx(-0.01)
    # stabilizer: switching slowest when the agent matches the environment (dh = 0)
    assert stab.switch_prob(0.0) == pytest.approx(0.1 * (1 - 0.95))
    assert stab.switch_prob(10.0) == pytest.approx(0.1, rel=1e-3)


def test_stationary_density_is_normalized():
    s = StationarySolver(NLParams(tau_E=30), 0.8).solve()
    assert s.errflag == 0
    assert s.q @ s.weights == pytest.approx(1.0, rel=1e-4)


@pytest.mark.slow
def test_optimal_memory_scaling():
    """Result 1 / Fig. 2c: tau_m* ~ tau_E^(1/2) for passive agents (h0 = 0.2, 1/tau_c = 1e-3)."""
    taus = np.logspace(1.5, 3.5, 5)
    betas = lobatto_beta(24)
    tm = []
    for tau in taus:
        p = NLParams(tau_E=float(tau))
        d, errs = mean_kl_curve(p, betas, n_jobs=8)
        b_star, _ = chebyshev_min(chebyshev_fit(betas, d, p.h0, errs))
        tm.append(-1 / np.log(b_star))
    slope = np.polyfit(np.log(taus), np.log(tm), 1)[0]
    assert slope == pytest.approx(0.5, abs=0.1)
