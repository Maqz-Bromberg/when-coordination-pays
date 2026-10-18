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


def test_true_source_observables_default_to_seeded_source():
    rng = np.random.default_rng(3)
    A0 = graphs.uniform_random(10, rng)
    src = schedules.markov(30, 10, 5.0, rng)
    args = (A0[None], graphs.edge_mask(A0)[None], src[None], np.array([0.2]), np.array([0.5]), np.array([1.0]),
            np.array([1.0]))
    _, obs = jax_kernel.run_batch(*args, record_every=5)
    np.testing.assert_allclose(np.asarray(obs["true_ed_block"]), np.asarray(obs["mean_ed_block"]), rtol=1e-12)
    noisy = schedules.noisy(src, 10, 0.5, rng)
    _, obs2 = jax_kernel.run_batch(*args[:2], noisy[None], *args[3:], true_sources=src[None], record_every=5)
    assert not np.allclose(np.asarray(obs2["true_ed_block"]), np.asarray(obs2["mean_ed_block"]))


def test_likelihood_reward_matches_rwed_in_the_symmetric_state():
    """E9: with lambda = rho and peers equalized, the likelihood reward reproduces the RWED reward without noise
    (both reduce to the closed form of B5)."""
    import numpy as np

    from nichenet.continuum import large_delta as ld
    from nichenet.core import graphs
    from nichenet.ss import jax_kernel

    n, B, steps = 12, 2, 400
    rng = np.random.default_rng(3)
    A0 = np.stack([graphs.uniform_random(n, rng) for _ in range(B)])
    mask = np.stack([graphs.edge_mask(a) for a in A0])
    src = np.zeros((B, steps), dtype=np.int64)
    par = (np.full(B, 0.2), np.zeros(B), np.ones(B), np.full(B, 0.45))
    out = {}
    for reward in ("rwed", "likelihood"):
        _, o = jax_kernel.run_batch(A0, mask, src, *par, tempered=True, record_every=100, reward=reward,
                                    symmetrize=True)
        out[reward] = np.asarray(o["source_attention"])[:, -1]
        info = np.asarray(o["info_cost_block"])[:, -1]
        assert np.all(info > 0) and np.all(info < np.log(n - 1))
    np.testing.assert_allclose(out["likelihood"], ld.x_star(n, 0.2, 0.45), rtol=1e-6)
    np.testing.assert_allclose(out["rwed"], ld.x_star(n, 0.2, 0.45), rtol=1e-6)
