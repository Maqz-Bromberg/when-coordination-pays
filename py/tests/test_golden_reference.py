"""nichenet faithful mode and metric ports against traces recorded from the 2020 thesis code
(tools/legacy_oracle/make_golden.py)."""

import numpy as np
import pytest

from nichenet.metrics import efficiency, hierarchy
from nichenet.ss import SSParams, run

N_CASES = 28
PARAM_KEYS = ("delta", "source_reward", "coupled", "update_interval", "eff_dist_to_source",
              "positive_correlation", "adapt_outgoing", "conserve_incoming", "undirected")


@pytest.mark.parametrize("case", range(N_CASES))
def test_ss_faithful_matches_thesis_code(ss_golden, case):
    data, meta = ss_golden
    cfg = meta[case]
    A_ref = data[f"A_hist_{case}"]
    p = SSParams.faithful(cfg["kappa"], cfg["phi"], **{k: cfg[k] for k in PARAM_KEYS})
    out = run(A_ref[0], data[f"sources_{case}"], p, record_A=True)
    assert out["A_hist"].shape == A_ref.shape
    np.testing.assert_allclose(out["A_hist"], A_ref, rtol=1e-9, atol=1e-12)
    assert out["errors"] == cfg["errors"]


@pytest.mark.parametrize("case", range(N_CASES))
def test_ss_faithful_distances_match(ss_golden, case):
    data, meta = ss_golden
    cfg = meta[case]
    p = SSParams.faithful(cfg["kappa"], cfg["phi"], **{k: cfg[k] for k in PARAM_KEYS})
    out = run(data[f"A_hist_{case}"][0], data[f"sources_{case}"], p)
    np.testing.assert_allclose(out["mean_ed"], data[f"ed_hist_{case}"].mean(axis=1), rtol=1e-9)


def _names(golden):
    return sorted(k[2:] for k in golden.files if k.startswith("A_"))


def test_hierarchy_thesis_variant_matches_thesis_code(hierarchy_golden):
    for name in _names(hierarchy_golden):
        A = hierarchy_golden[f"A_{name}"]
        for key, exp in (("lin", None), ("exp", 0.5)):
            o, f, t = hierarchy_golden[f"{key}_{name}"]  # thesis order: orderability, feedforwardness, treeness
            got = hierarchy.hierarchy_coordinates(A, exp_threshold_distribution=exp, variant="thesis")
            np.testing.assert_allclose([got.orderability, got.feedforwardness, got.treeness], [o, f, t],
                                       rtol=1e-9, atol=1e-12, err_msg=f"{name} ({key} thresholds)")


def test_efficiency_matches_thesis_code(efficiency_golden):
    for name in _names(efficiency_golden):
        A = efficiency_golden[f"A_{name}"]
        np.testing.assert_allclose(efficiency.network_efficiencies(A, normalize=False),
                                   efficiency_golden[f"raw_{name}"], rtol=1e-9, err_msg=name)
        np.testing.assert_allclose(efficiency.network_efficiencies(A, normalize=True),
                                   efficiency_golden[f"norm_{name}"], rtol=1e-7, err_msg=name)
