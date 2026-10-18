# Churn, Niches and Hierarchy

Implements the program in [PLAN.md](PLAN.md): the 2020 source-to-structure model (Bromberg 2020), optimal learning
in noisy niches (Lee, Flack & Krakauer 2024) and adaptive transport networks, as one Python package (`py/`,
`nichenet`) with a static Next.js site (`web/`).

```sh
make envs          # conda envs: nichenet (main) and nvd-legacy (runs the thesis code as an oracle)
make test          # nichenet tests, incl. golden traces recorded from the thesis code
make test-legacy   # checks of the thesis code's own behaviour
make site serve    # build and serve the private site on localhost:8000
```

- `py/src/nichenet/ss/`: SS model. `model.py` is the numpy reference (faithful and clean modes);
  `jax_kernel.py` is the batched GPU path for sweeps.
- `py/src/nichenet/metrics/`: hierarchy coordinates (Corominas-Murtra et al. 2013; the thesis variant is
  kept for comparison) and efficiency coordinates.
- `docs/errata.md`: errors and implementation behaviours found in the thesis code, each with a test.
- `tools/legacy_oracle/`: the env, shim and recorder for the thesis code. `reference/` (not in git) holds the clones;
  see `reference/README.md`.
- Papers live in `papers/` and are not in git.
