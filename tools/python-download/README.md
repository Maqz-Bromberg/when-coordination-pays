# When coordination pays: Python code and tests

The Python behind *When coordination pays*: the model, its analysis and the tests the site's validation appendix
reports.

- `py/`: `nichenet`, the model and experiments. Its tests include golden traces recorded from the 2020 thesis code
  (`py/tests/golden/`), the fixed points and their stability, transport networks, and Lee, Flack & Krakauer (2024).
- `environment.yml`: the conda environment the results were produced in.

The hierarchy coordinates (treeness, feedforwardness, orderability) are a separate package with its own tests:
[github.com/Maqz-Bromberg/hierarchy-coordinates](https://github.com/Maqz-Bromberg/hierarchy-coordinates).

## Running the tests

With pip (Python 3.10 or later):

```sh
python -m venv .venv && . .venv/bin/activate
pip install numpy scipy networkx pytest
pip install -e py
cd py && pytest -q
```

Or with conda: `conda env create -f environment.yml`, then `conda activate nichenet` and the last two lines above.

The JAX kernel tests are skipped unless `jax` is installed (`pip install -e "py[fast]"`). Slow statistical tests are off
by default; run them with `pytest -q -m "slow or not slow"`. The experiments that produce the site's figures need the
`experiments` extra, which also installs hierarchy-coordinates 0.1.0 from GitHub (`pip install -e "py[experiments]"`),
and are run as `python -m nichenet.experiments.<name>`. The checks of the thesis's hierarchy coordinates
(`tests/test_hierarchy_thesis.py`) skip unless that version is installed.
