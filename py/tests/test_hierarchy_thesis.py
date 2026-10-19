"""Errata H1 and H2 (docs/errata.md): the ``thesis`` variant of hierarchy-coordinates 0.1.0, the version nichenet pins,
reproduces the 2020 thesis code, and differs from the Corominas-Murtra definitions where the errata say.

Later versions of hierarchy-coordinates drop the thesis variant, so these tests skip without it."""

from pathlib import Path

import networkx as nx
import numpy as np
import pytest

hc = pytest.importorskip("hierarchy_coordinates")
if "thesis" not in getattr(hc, "VARIANTS", {}):
    pytest.skip("needs hierarchy-coordinates 0.1.0 (the version nichenet pins)", allow_module_level=True)

GOLDEN = Path(__file__).parent / "golden" / "hierarchy.npz"  # tools/legacy_oracle/make_golden.py


def test_elementwise_power_drops_reach_weighting():
    """0 -> 1 <- 2 and 3 -> 4. Reversing from the two minimal nodes {1, 4}: only the walk from 1 meets a choice
    (k_in(1) = 2), so H_b = (ln 2) / 2. The thesis code sums log k_in over all non-maximal nodes regardless of
    which minimal node the walk starts from, giving ln 2."""
    G = nx.DiGraph([(0, 1), (2, 1), (3, 4)])
    assert hc.graph_entropy(G, forward=False, power="matrix") == pytest.approx(np.log(2) / 2)
    assert hc.graph_entropy(G, forward=False, power="elementwise") == pytest.approx(np.log(2))


def test_elementwise_power_counts_unreachable_choices():
    """0 -> 1 -> 2 and 3 -> 4 <- 5: the fork into 4 is reachable from 4 only, but the thesis entropy charges it to
    every walk."""
    G = nx.DiGraph([(0, 1), (1, 2), (3, 4), (5, 4)])
    assert hc.graph_entropy(G, forward=False, power="matrix") == pytest.approx(np.log(2) / 2)
    assert hc.graph_entropy(G, forward=False, power="elementwise") == pytest.approx(np.log(2))


def test_thesis_variant_matches_thesis_code():
    golden = np.load(GOLDEN)
    names = sorted(k[2:] for k in golden.files if k.startswith("A_"))
    assert names
    for name in names:
        A = golden[f"A_{name}"]
        for key, exp in (("lin", None), ("exp", 0.5)):
            o, f, t = golden[f"{key}_{name}"]  # thesis order: orderability, feedforwardness, treeness
            got = hc.hierarchy_coordinates(A, exp_threshold_distribution=exp, variant="thesis")
            np.testing.assert_allclose([got.orderability, got.feedforwardness, got.treeness], [o, f, t],
                                       rtol=1e-9, atol=1e-12, err_msg=f"{name} ({key} thresholds)")
