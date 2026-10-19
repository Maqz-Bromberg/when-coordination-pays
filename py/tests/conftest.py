import json
from pathlib import Path

import numpy as np
import pytest

GOLDEN = Path(__file__).parent / "golden"


@pytest.fixture(scope="session")
def ss_golden():
    data = np.load(GOLDEN / "ss_traces.npz")
    meta = json.loads(str(data["meta"]))
    return data, meta


@pytest.fixture(scope="session")
def efficiency_golden():
    return np.load(GOLDEN / "efficiency.npz")
