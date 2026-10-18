"""Random-walker effective distance (Iannelli et al. 2017), as computed in the 2020 thesis code."""

import numpy as np

ZERO_SUBSTITUTE = 1e-100  # the thesis code replaces zeros of Z·Diag(Z)^-1 by this before taking the log


def row_normalize(A):
    """Transition matrix T = A / rowsum. Rows that sum to zero stay zero."""
    s = A.sum(axis=1, keepdims=True)
    return np.divide(A, s, out=np.zeros_like(A, dtype=float), where=s != 0)


def col_normalize(A):
    s = A.sum(axis=0, keepdims=True)
    return np.divide(A, s, out=np.zeros_like(A, dtype=float), where=s != 0)


def rwed(T, delta):
    """All-pairs RWED, D[i, j] = -ln(Z_ij / Z_jj) with Z = (I - e^-delta T)^-1.

    ``T`` must be row-stochastic. Returns ``(D, n_zero_substitutions)``; the count mirrors the thesis
    code's ``_singular_fundamental_matrix_errors`` (1 if any entry of Z·Diag(Z)^-1 was exactly zero).
    """
    n = T.shape[0]
    Z = np.linalg.inv(np.eye(n) - T * np.exp(-delta))
    ZD = Z / np.diagonal(Z)[None, :]
    errors = 0
    if np.any(ZD == 0):
        ZD = np.where(ZD == 0, ZERO_SUBSTITUTE, ZD)
        errors = 1
    return -np.log(ZD), errors


def rwed_large_delta(T, delta):
    """First-order RWED for delta >> 1: D[i, j] = delta - ln T_ij (exact up to O(e^-delta)); D[i, i] = 0."""
    with np.errstate(divide="ignore"):
        D = delta - np.log(T)
    np.fill_diagonal(D, 0.0)
    return D
