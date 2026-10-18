import numpy as np
import pytest

jax_kernel = pytest.importorskip("nichenet.ss.jax_kernel")

from nichenet.core import graphs
from nichenet.ss import SSParams, run, schedules

CONFIGS = [  # kappa, phi, eps, tempered, temperature, init
    (0.3, 0.7, 1.0, False, 1.0, "complete"),
    (0.0, 0.9, 1.0, False, 1.0, "complete"),
    (0.8, 1.0, 1.0, False, 1.0, "complete"),
    (0.5, 0.0, 0.3, False, 1.0, "complete"),
    (0.5, 0.5, 1.0, False, 1.0, "sparse"),
    (0.2, 0.0, 0.5, True, 0.25, "complete"),
    (0.6, 0.0, 1.0, True, 2.0, "sparse"),
]


def test_jax_matches_numpy_clean_mode():
    n, T = 16, 60
    rng = np.random.default_rng(10)
    A0s, masks, srcs = [], [], []
    for *_, init in CONFIGS:
        A0 = graphs.uniform_random(n, rng) if init == "complete" else graphs.sparse_random(n, 4, rng)
        A0s.append(A0)
        masks.append(graphs.edge_mask(A0))
        srcs.append(schedules.markov(T, n, 8.0, rng))
    k, f, e, temp_flag, temp, _ = zip(*CONFIGS, strict=True)
    for tempered in (False, True):
        idx = [i for i, t in enumerate(temp_flag) if t == tempered]
        A_jax, obs = jax_kernel.run_batch(
            np.stack([A0s[i] for i in idx]), np.stack([masks[i] for i in idx]), np.stack([srcs[i] for i in idx]),
            np.array([k[i] for i in idx]), np.array([f[i] for i in idx]), np.array([e[i] for i in idx]),
            np.array([temp[i] for i in idx]), tempered=tempered)
        for j, i in enumerate(idx):
            sel = "tempered" if tempered else "top_fraction"
            p = SSParams.clean(k[i], f[i], epsilon=e[i], selection=sel, temperature=temp[i])
            ref = run(A0s[i], srcs[i], p)
            np.testing.assert_allclose(np.asarray(A_jax[j]), ref["A"], rtol=1e-9, atol=1e-12, err_msg=str(CONFIGS[i]))
            np.testing.assert_allclose(np.asarray(obs["source_attention"][j]), ref["source_attention"], rtol=1e-9)
            np.testing.assert_allclose(np.asarray(obs["mean_ed"][j]), ref["mean_ed"], rtol=1e-9)
