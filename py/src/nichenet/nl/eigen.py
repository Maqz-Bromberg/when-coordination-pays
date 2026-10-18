"""Stationary-density (eigenfunction) solution of the niche-learning model, Lee et al. (2024) SI §4.

Port of ``reference/adaptation/pyutils/eigen.py`` (Passive and Active classes) with the same lattice, Gaussian
sensing noise, sparsity threshold, iteration and convergence rules, so results agree with the paper's code.
Kernels are assembled in column blocks instead of as dense n x n arrays, which keeps memory to O(nnz).

For agent bias density q(x | h_E = +h0) on a lattice x in [-L, L]:
    q <- (1 - 1/tau_E) Stay[q] + (1/tau_E) mirror(Leave[q])
where Stay/Leave carry a sensed field h_hat = (x - beta x') / (1 - beta) with Gaussian error in probability
space, sd sqrt(p+ p- / tau_c), and Jacobian (1/2) sech^2(h_hat) / (1 - beta). Active agents weight the two terms
by the switch probability, which depends on the previous estimate x'. Mean cost D = sum_x D_KL(p_E || p_x) q(x).
"""

from dataclasses import dataclass

import numpy as np
from numpy.polynomial.chebyshev import chebder, chebfit, chebroots, chebval
from scipy import sparse

from .params import NLParams, kl_to_env, pminus, pplus

ZERO_THRESHOLD = 1e-20


def default_x_spacing(beta, h0, tau_c, res_factor=4.0):
    """Lattice spacing from the expected peak width, as ``utils.default_x_spacing`` (max 0.01)."""
    if beta == 0:
        beta = 1e-10
    return min(np.sqrt(pplus(h0) * pminus(h0) / tau_c / (-1 / np.log(beta))) / res_factor, 0.01)


def lobatto_beta(deg):
    """Chebyshev-Gauss-Lobatto points in beta in [0, 1), excluding beta = 1 (``utils.lobatto_beta``)."""
    x = -np.cos(np.pi * np.arange(deg + 1) / deg)[:-1]
    return (x + 1) / 2


@dataclass
class Solution:
    beta: float
    h0: float
    x: np.ndarray
    q: np.ndarray  # density conditional on h_E = +h0 (last iterate, as in the reference)
    weights: np.ndarray  # trapezoid weights
    err: float
    errflag: int
    iterations: int

    @property
    def mean_kl(self):
        return float((kl_to_env(self.h0, self.x) * self.q) @ self.weights)


class StationarySolver:
    """Transfer operator for one (params, beta) on a lattice."""

    def __init__(self, params: NLParams, beta, L=0.5, dx=None, block=512):
        if not 0 <= params.h0 < L:
            raise ValueError("need 0 <= h0 < L")
        if not 0 <= beta < 1:
            raise ValueError("beta must be in [0, 1)")
        self.p, self.beta, self.L = params, beta, L
        if dx is None:
            dx = default_x_spacing(beta, params.h0, params.tau_c)
            if params.alpha < 0:  # the reference uses a finer lattice for stabilizers
                dx /= 1.25
        self.dx = dx
        half = np.arange(L // dx + 1) * dx
        self.x = np.concatenate((-half[1:][::-1], half))
        if self.x.size > 1e5:
            raise ValueError("lattice too large (> 1e5 points)")
        self.M = np.full(self.x.size, dx)
        self.M[0] /= 2
        self.M[-1] /= 2
        self.stay_k, self.leave_k = self._kernels(block)

    def _kernels(self, block):
        p, beta, x = self.p, self.beta, self.x
        s = np.sqrt(pplus(p.h0) * pminus(p.h0) / p.tau_c)
        norm = 1.0 / (np.sqrt(2 * np.pi) * s)
        active = p.alpha != 0
        if active:
            stay_p = 1.0 - p.switch_prob(p.h0 - x)  # depends on the previous estimate (columns)
        stays, leaves = [], []
        for j0 in range(0, x.size, block):
            xj = x[j0:j0 + block]
            dhhat = (x[:, None] - xj[None, :] * beta) / (1 - beta)
            th = np.tanh(dhhat)
            jac = 0.5 * (1 - th ** 2)
            st = norm * np.exp(-((np.tanh(p.h0) - th) / 2) ** 2 / (2 * s ** 2)) * jac
            lv = norm * np.exp(-((-np.tanh(p.h0) - th) / 2) ** 2 / (2 * s ** 2)) * jac
            st[st < ZERO_THRESHOLD] = 0.0
            lv[lv < ZERO_THRESHOLD] = 0.0
            if active:
                sp = stay_p[j0:j0 + block]
                st = st * (sp[None, :] if p.tau_E == 1 else sp[None, :] / (1 - 1 / p.tau_E))
                lv = lv * ((1 - sp)[None, :] * p.tau_E)
            stays.append(sparse.csc_matrix(st))
            leaves.append(sparse.csc_matrix(lv))
        # fold in trapezoid weights and the 1/(1-beta) Jacobian once
        W = sparse.diags(self.M / (1 - beta))
        return (sparse.hstack(stays).tocsr() @ W), (sparse.hstack(leaves).tocsr() @ W)

    def apply(self, q):
        out = self.leave_k @ q / self.p.tau_E
        out = out[::-1].copy()
        if self.p.alpha != 0 and self.p.tau_E == 1:
            out += self.stay_k @ q
        elif self.p.tau_E > 1:
            out += (1 - 1 / self.p.tau_E) * (self.stay_k @ q)
        return out

    def solve(self, tol=1e-5, mx_tol=1e6, tmax=1000):
        """Iterate to the stationary density, mirroring ``_solve_external_cond``."""
        q = np.ones_like(self.x)
        q /= q @ self.M
        old = q
        err, counter = tol * 10, 0
        while counter <= tmax and mx_tol > err > tol:
            q = q / (q @ self.M)
            old = q
            q = self.apply(q)
            err = float(np.sqrt(((q - old) ** 2) @ self.M))
            counter += 1
        counter -= 1
        errflag = 2 if err > tol else 0  # as the reference: the tolerance check supersedes the iteration cap
        return Solution(self.beta, self.p.h0, self.x, q, self.M, err, errflag, counter)


def mean_kl_curve(params: NLParams, betas, L=0.5, tmax=None, n_jobs=1, **solve_kw):
    """D(beta) and iteration errors for each beta (``eigen.Passive/Active.dkl``)."""
    if tmax is None:
        tmax = 1500 if params.alpha < 0 else 1000

    def one(b):
        s = StationarySolver(params, float(b), L=L).solve(tmax=tmax, **solve_kw)
        return s.mean_kl, s.err

    if n_jobs == 1:
        out = [one(b) for b in betas]
    else:
        from joblib import Parallel, delayed
        out = Parallel(n_jobs=n_jobs)(delayed(one)(b) for b in betas)
    d, e = (np.array(v) for v in zip(*out, strict=True))
    return d, e


def chebyshev_fit(betas, d, h0, errs=None, tol=1e-4, infinite_memory_cost=None):
    """Chebyshev fit of log D(beta) through points with small iteration error, plus beta = 1 (``utils.interpolate``)."""
    betas, d = np.asarray(betas, float), np.asarray(d, float)
    keep = np.ones(betas.size, bool) if errs is None else np.asarray(errs) < tol
    x, y = betas[keep], d[keep]
    if x[-1] != 1:
        x = np.append(x, 1.0)
        y = np.append(y, np.log(2) - (-pplus(h0) * np.log(pplus(h0)) - pminus(h0) * np.log(pminus(h0)))
                      if infinite_memory_cost is None else infinite_memory_cost)
    coeffs = chebfit(x * 2 - 1, np.log(y), x.size - 1)
    return coeffs


def chebyshev_min(coeffs):
    """(beta*, D(beta*)) from the roots of the fitted derivative in [0, 1] (``utils.find_chebmin``)."""
    roots = (chebroots(chebder(coeffs)) + 1) / 2
    roots = roots[np.abs(roots.imag) < 1e-10].real
    roots = roots[(roots >= 0) & (roots <= 1)]
    vals = np.exp(chebval(roots * 2 - 1, coeffs))
    i = int(np.argmin(vals))
    return float(roots[i]), float(vals[i])
