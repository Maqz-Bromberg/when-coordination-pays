"""Source schedules: explicit arrays of source indices, one per seeding step.

Generating sources up front (from a seeded Generator) makes runs reproducible and lets the same schedule drive
the SS model, the transport models and the golden traces. The thesis code's own random seeding used an
unseeded ``default_rng()``.
"""

import numpy as np


def constant(steps, source):
    return np.full(steps, source, dtype=np.int64)


def random(steps, n, rng):
    """A new uniformly random source every step."""
    return rng.integers(n, size=steps)


def shifts(steps, n, n_shifts, rng):
    """The thesis "set number of shifts": a new, previously unused source whenever t % int(steps / n_shifts) == 0.

    As in the thesis code the first source is also drawn this way (t = 0), so ``n_shifts`` shifts over ``steps``
    steps give ceil(steps / int(steps / n_shifts)) distinct sources, e.g. 13 for 10 shifts over 25 steps.
    Once every node has been a source (or if n_shifts > n), new sources are drawn uniformly.
    """
    period = int(steps / n_shifts)
    if period < 1:
        raise ValueError("n_shifts must not exceed steps")
    out = np.empty(steps, dtype=np.int64)
    used = []
    current = -1
    for t in range(steps):
        if t % period == 0:
            unused = sorted(set(range(n)) - set(used))
            current = int(rng.integers(n)) if (n_shifts > n or not unused) else int(rng.choice(unused))
            used.append(current)
        out[t] = current
    return out


def markov(steps, n, tau_E, rng, start=None):
    """Persistent source with mean dwell time tau_E: each step it jumps with probability 1/tau_E to another node.

    Not in the thesis; this is the switching environment of Lee et al. (2024) with K = n states.
    """
    out = np.empty(steps, dtype=np.int64)
    current = int(rng.integers(n)) if start is None else int(start)
    jumps = rng.random(steps) < 1.0 / tau_E
    offsets = rng.integers(1, n, size=steps)
    for t in range(steps):
        if t > 0 and jumps[t]:
            current = (current + int(offsets[t])) % n
        out[t] = current
    return out


def power_law(steps, n, a, rng):
    """Thesis power-law seeding: index round(x * n) - 1 with x ~ Power(a), concentrated on high indices.

    The thesis code maps x * n < 0.5 to index -1, i.e. the last node; that rare case is kept as node n - 1.
    """
    idx = np.rint(rng.power(a, size=steps) * n).astype(np.int64) - 1
    return np.where(idx < 0, n - 1, idx)
