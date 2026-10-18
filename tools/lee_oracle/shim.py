"""Import Lee et al.'s eigen and agent modules without the paper's private plotting/workspace packages."""
import sys
import types
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
ADAPTATION = REPO_ROOT / "reference" / "adaptation"

ws = types.ModuleType("workspace")
ws.utils = types.ModuleType("workspace.utils")
ws.utils.save_pickle = lambda *a, **k: None
sys.modules.setdefault("workspace", ws)
sys.modules.setdefault("workspace.utils", ws.utils)
sys.path.insert(0, str(ADAPTATION))
# Register pyutils as a bare package so its __init__ (which imports pipeline and plot) does not run.
pkg = types.ModuleType("pyutils")
pkg.__path__ = [str(ADAPTATION / "pyutils")]
sys.modules.setdefault("pyutils", pkg)

# isort: off
from pyutils import agent, eigen  # noqa: E402,F401
from pyutils.utils import find_chebmin, interpolate, lobatto_beta  # noqa: E402,F401
# isort: on
