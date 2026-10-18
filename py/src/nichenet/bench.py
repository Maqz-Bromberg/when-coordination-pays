"""Step-cost benchmark for the SS model: numpy reference vs batched JAX (CPU and, if present, GPU).

    conda run -n nichenet python -m nichenet.bench [--n 60] [--steps 2000] [--batch 64] [--gpu-only]

JAX on the CPU is slower than numpy for these small batched inverses and can run out of memory at large batches;
use ``--gpu-only`` for sweep-sized batches.
"""

import argparse
import os
import time

import numpy as np


def bench_numpy(n, steps):
    from nichenet.core import graphs
    from nichenet.ss import SSParams, run, schedules
    rng = np.random.default_rng(0)
    A0 = graphs.uniform_random(n, rng)
    src = schedules.markov(steps, n, 50.0, rng)
    t0 = time.perf_counter()
    run(A0, src, SSParams.clean(0.3, 0.7))
    return (time.perf_counter() - t0) / steps


def bench_jax(n, steps, batch, device):
    import jax

    from nichenet.core import graphs
    from nichenet.ss import jax_kernel, schedules
    rng = np.random.default_rng(0)
    A0 = np.stack([graphs.uniform_random(n, rng) for _ in range(batch)])
    mask = np.stack([graphs.edge_mask(a) for a in A0])
    src = np.stack([schedules.markov(steps, n, 50.0, rng) for _ in range(batch)])
    par = [np.full(batch, v) for v in (0.3, 0.7, 1.0, 1.0)]
    with jax.default_device(device):
        args = [jax.device_put(x, device) for x in (A0, mask, src, *par)]
        jax.block_until_ready(jax_kernel.run_batch(*args, record_every=10))  # compile
        t0 = time.perf_counter()
        jax.block_until_ready(jax_kernel.run_batch(*args, record_every=10))
    return (time.perf_counter() - t0) / (steps * batch)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=60)
    ap.add_argument("--steps", type=int, default=2000)
    ap.add_argument("--batch", type=int, default=64)
    ap.add_argument("--gpu-only", action="store_true")
    a = ap.parse_args()
    print(f"N = {a.n}, {a.steps} steps; per-step cost (one run-step):")
    print(f"  numpy, 1 run, 1 thread view : {bench_numpy(a.n, min(a.steps, 1000)) * 1e3:.3f} ms")
    import jax
    gpus = [d for d in jax.devices() if d.platform == "gpu"]
    devs = gpus if a.gpu_only else jax.devices("cpu") + gpus
    for dev in devs:
        print(f"  jax {dev.platform:3s}, batch {a.batch:4d}     : {bench_jax(a.n, a.steps, a.batch, dev) * 1e3:.4f} ms")
    print(f"  (cpu threads available: {os.cpu_count()})")


if __name__ == "__main__":
    main()
