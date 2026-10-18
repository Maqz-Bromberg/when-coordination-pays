"""Batched JAX kernel for clean-mode SS sweeps (jit + vmap over runs, lax.scan over time).

Covers the thesis base case (distances from the source, in-weight conserved, nodes adapt in-edges, directed) with
clean-mode fixes: rewards masked to the initial edge set, phi quantile over in-neighbours, reward weight epsilon.
Selection is the phi cut ("top_fraction") or tempered (r ∝ S^(1/T)). Tested against ``ss.model`` in
``tests/test_jax_kernel.py``; use ``ss.model`` for anything outside this case.

Two extensions (E9): ``reward="likelihood"`` replaces the distance factor D_k^(kappa-1) by lambda^(1-kappa) on the
seeded node and 1 elsewhere, a fixed-likelihood-ratio (Kelly / multiplicative-weights) reward with no relays; with
lambda = rho it equals the RWED reward in the symmetric large-delta state. ``symmetrize=True`` replaces, after every
update, each column's weights on peers (nodes other than the true source and the column's own node) by their mean,
removing peer heterogeneity while keeping attention on the true source (test of A4).
"""

from functools import partial

import jax
import jax.numpy as jnp
import numpy as np

jax.config.update("jax_enable_x64", True)


def _fundamental(A, delta):
    n = A.shape[0]
    rs = A.sum(axis=1, keepdims=True)
    T = jnp.where(rs > 0, A / jnp.where(rs > 0, rs, 1.0), 0.0)
    return jnp.linalg.inv(jnp.eye(n) - T * jnp.exp(-delta))


def _row_distances(Z, s, rho):
    n = Z.shape[0]
    zd = Z[s] / jnp.diagonal(Z)
    d = -jnp.log(jnp.where(zd == 0, 1e-100, zd))
    others_min = jnp.min(jnp.where(jnp.arange(n) == s, jnp.inf, d))
    return d.at[s].set(others_min / rho)


def _distances(A, s, delta, rho):
    return _row_distances(_fundamental(A, delta), s, rho)


def _update(A, mask, X, kappa, phi, eps, temperature, tempered):
    n = A.shape[0]
    S = jnp.where(mask, jnp.power(X, kappa - 1.0)[:, None] * jnp.power(A, kappa), 0.0)
    tot = S.sum(axis=0, keepdims=True)
    S = jnp.where(tot > 0, S / jnp.where(tot > 0, tot, 1.0), 0.0)

    # phi cut over in-neighbours
    srt = jnp.sort(jnp.where(mask, S, jnp.inf), axis=0)
    count = mask.sum(axis=0)
    idx = jnp.where(phi >= 1.0, count - 1, jnp.floor(phi * count).astype(jnp.int64))
    idx = jnp.clip(idx, 0, n - 1)
    cutoff = jnp.take_along_axis(srt, idx[None, :], axis=0)[0]
    cut = jnp.where(mask & (S >= cutoff[None, :]), S, 0.0)
    best = jnp.argmax(jnp.where(mask, S, -jnp.inf), axis=0)
    onehot = (jnp.arange(n)[:, None] == best[None, :]) * S
    cut = jnp.where(cut.sum(axis=0, keepdims=True) > 0, cut, onehot)

    temp = jnp.where(mask, jnp.power(S, 1.0 / temperature), 0.0)
    red = jnp.where(tempered, temp, cut)
    rt = red.sum(axis=0, keepdims=True)
    r = jnp.where(rt > 0, red / jnp.where(rt > 0, rt, 1.0), 0.0)

    A = A + eps * r
    cs = A.sum(axis=0, keepdims=True)
    return jnp.where(cs > 0, A / jnp.where(cs > 0, cs, 1.0), 0.0)


def _symmetrize_peers(A, mask, t):
    n = A.shape[0]
    k = jnp.arange(n)[:, None]
    i = jnp.arange(n)[None, :]
    peers = mask & (k != t) & (k != i)
    mean = (A * peers).sum(axis=0, keepdims=True) / jnp.maximum(peers.sum(axis=0, keepdims=True), 1)
    return jnp.where(peers, mean, A)


def _run_one(A0, mask, sources, true_sources, kappa, phi, eps, temperature, lam, delta, rho, tempered, record_every,
             reward, symmetrize):
    n = A0.shape[0]

    def step(A, st):
        s, t = st
        if reward == "rwed":
            Z = _fundamental(A, delta)
            d = _row_distances(Z, s, rho)
            d_true = _row_distances(Z, t, rho)  # distances from the true (persistent) source, before the update
            X = d / d.sum()
        else:
            d = d_true = jnp.zeros(n)
            X = jnp.where(jnp.arange(n) == s, 1.0 / lam, 1.0)  # X^(kappa-1) = lambda^(1-kappa) on the seed
        A_new = _update(A, mask, X, kappa, phi, eps, temperature, tempered)
        if symmetrize:
            A_new = _symmetrize_peers(A_new, mask, t)
        attention = (A_new[s].sum() - A_new[s, s]) / (n - 1)
        true_attention = (A_new[t].sum() - A_new[t, t]) / (n - 1)
        others = jnp.arange(n) != t
        # log-loss of attention on the true source (Kelly regret against always betting on it), before the update
        logloss = jnp.sum(jnp.where(others, -jnp.log(jnp.maximum(A[t], 1e-300)), 0.0)) / (n - 1)
        # information cost of commitment: mean over nodes of KL(attention column || uniform over the other nodes)
        plogp = jnp.where(A > 0, A * jnp.log(jnp.where(A > 0, A, 1.0)), 0.0)
        info = jnp.log(n - 1.0) + plogp.sum() / n
        return A_new, (d.mean(), attention, d_true.mean(), true_attention, logloss, info)

    T = sources.shape[0]
    blocks = T // record_every
    src = sources[: blocks * record_every].reshape(blocks, record_every)
    tru = true_sources[: blocks * record_every].reshape(blocks, record_every)

    def block(A, st_block):
        A, (ed, att, ted, tatt, ll, info) = jax.lax.scan(step, A, st_block)
        return A, (ed[-1], att[-1], ed.mean(), att.mean(), ted.mean(), tatt.mean(), ll.mean(), info.mean())

    A, (ed_last, att_last, ed_mean, att_mean, ted_mean, tatt_mean, ll_mean, info_mean) = jax.lax.scan(
        block, A0, (src, tru))
    return A, {"mean_ed": ed_last, "source_attention": att_last,
               "mean_ed_block": ed_mean, "source_attention_block": att_mean,
               "true_ed_block": ted_mean, "true_attention_block": tatt_mean, "true_logloss_block": ll_mean,
               "info_cost_block": info_mean}


@partial(jax.jit, static_argnames=("record_every", "tempered", "reward", "symmetrize"))
def _run_batch(A0, mask, sources, true_sources, kappa, phi, eps, temperature, lam, delta, rho, tempered, record_every,
               reward, symmetrize):
    fn = jax.vmap(_run_one, in_axes=(0, 0, 0, 0, 0, 0, 0, 0, 0, None, None, None, None, None, None))
    return fn(A0, mask, sources, true_sources, kappa, phi, eps, temperature, lam, delta, rho, tempered, record_every,
              reward, symmetrize)


def run_batch(A0, mask, sources, kappa, phi, eps, temperature, delta=10.0, rho=2.6, *, true_sources=None,
              tempered=False, record_every=1, reward="rwed", lam=None, symmetrize=False):
    """Run B independent clean-mode simulations (update interval 1).

    Shapes: A0, mask (B, n, n); sources (B, T); kappa, phi, eps, temperature (B,). ``true_sources`` (B, T) defaults
    to ``sources``; when the seeded source is a noisy observation of a persistent one, the ``true_*`` observables
    measure distance and attention relative to the true source. Observables are recorded per block of
    ``record_every`` steps (last value and block mean), so outputs have shape (B, T // record_every).
    """
    true_sources = sources if true_sources is None else true_sources
    lam = np.full(np.shape(kappa), rho) if lam is None else lam
    return _run_batch(A0, mask, sources, true_sources, kappa, phi, eps, temperature, lam, delta, rho, tempered,
                      record_every, reward, symmetrize)


def as_batch(values, B):
    v = np.asarray(values, dtype=float)
    return np.broadcast_to(v, (B,)).copy() if v.ndim == 0 else v
