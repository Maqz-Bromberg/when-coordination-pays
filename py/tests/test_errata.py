"""Erratum H1 (docs/errata.md): the thesis computes path probabilities with element-wise powers."""

import networkx as nx
import numpy as np
import pytest

from nichenet.metrics.hierarchy import graph_entropy


def test_elementwise_power_drops_reach_weighting():
    """0 -> 1 <- 2 and 3 -> 4. Reversing from the two minimal nodes {1, 4}: only the walk from 1 meets a choice
    (k_in(1) = 2), so H_b = (ln 2) / 2. The thesis code sums log k_in over all non-maximal nodes regardless of
    which minimal node the walk starts from, giving ln 2."""
    G = nx.DiGraph([(0, 1), (2, 1), (3, 4)])
    assert graph_entropy(G, forward=False, power="matrix") == pytest.approx(np.log(2) / 2)
    assert graph_entropy(G, forward=False, power="elementwise") == pytest.approx(np.log(2))


def test_elementwise_power_counts_unreachable_choices():
    """0 -> 1 -> 2 and 3 -> 4 <- 5: the fork into 4 is reachable from 4 only, but the thesis entropy charges it to
    every walk."""
    G = nx.DiGraph([(0, 1), (1, 2), (3, 4), (5, 4)])
    assert graph_entropy(G, forward=False, power="matrix") == pytest.approx(np.log(2) / 2)
    assert graph_entropy(G, forward=False, power="elementwise") == pytest.approx(np.log(2))
