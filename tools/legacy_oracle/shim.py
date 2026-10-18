"""Import the 2020 thesis code (reference/Networks_Via_Diffusion) without its plotting stack."""
import sys
import types
import warnings
from pathlib import Path

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
NVD_DIR = REPO_ROOT / "reference" / "Networks_Via_Diffusion"

warnings.filterwarnings("ignore")
if not hasattr(np, "int"):  # removed in numpy 1.24
    np.int = int
sys.modules.setdefault("plotter", types.ModuleType("plotter"))  # graph.py imports it; only needed for figures
sys.path.insert(0, str(NVD_DIR))

import efficiency_coordinates  # noqa: E402, F401
import graph  # noqa: E402, F401

SOURCE_REWARD = 2.6
DELTA = 10.0


def step(G, source, delta=DELTA):
    """Run one update with an explicit source. Source 0 is passed as False by the reference code
    and silently becomes random seeding, so callers must use source >= 1."""
    assert source >= 1, "reference code treats constant_source_node=0 as random seeding"
    A_before = G.A[-1].copy()
    G.simulate(num_runs=1, eff_dist_delta_param=delta, constant_source_node=source, equilibrium_distance=0)
    return A_before, G.A[-1].copy()
