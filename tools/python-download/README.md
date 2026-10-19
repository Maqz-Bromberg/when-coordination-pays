# When coordination pays: Python code and tests

The Python behind *When coordination pays*: the model, its analysis and the tests the site's validation appendix
reports.

- `hierarchy-coordinates/`: the hierarchy coordinates (treeness, feedforwardness, orderability) of Corominas-Murtra et
  al. (2013) for weighted graphs, a standalone package. Its tests check the paper's known cases and agreement with the
  2020 thesis code.
- `py/`: `nichenet`, the model and experiments. Its tests include golden traces recorded from the 2020 thesis code
  (`py/tests/golden/`), the fixed points and their stability, transport networks, and Lee, Flack & Krakauer (2024).
- `environment.yml`: the conda environment the results were produced in.

## Running the tests

With pip (Python 3.10 or later):

```sh
python -m venv .venv && . .venv/bin/activate
pip install numpy scipy networkx pytest
pip install -e hierarchy-coordinates -e py
(cd hierarchy-coordinates && pytest -q)
(cd py && pytest -q)
```

Or with conda: `conda env create -f environment.yml`, then `conda activate nichenet` and the last three lines above.

The JAX kernel tests are skipped unless `jax` is installed (`pip install -e "py[fast]"`). Slow statistical tests are off
by default; run them with `pytest -q -m "slow or not slow"`. The experiments that produce the site's figures need the
`experiments` extra (`pip install -e "py[experiments]"`) and are run as `python -m nichenet.experiments.<name>`.
