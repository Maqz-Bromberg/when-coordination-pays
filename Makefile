# All Python runs through conda envs (environment.yml, tools/legacy_oracle/environment.yml).
RUN    = conda run --no-capture-output -n nichenet
LEGACY = conda run --no-capture-output -n nvd-legacy
LEE    = conda run --no-capture-output -n lee-ref
export XLA_PYTHON_CLIENT_PREALLOCATE = false

.PHONY: envs test test-slow test-legacy test-pyodide golden bench errata v-nl1 wheel site serve

envs:            ## create the three conda envs and install nichenet in editable mode
	conda env create -f environment.yml
	conda env create -f tools/legacy_oracle/environment.yml
	conda env create -f tools/lee_oracle/environment.yml
	$(RUN) pip install -e py

test:            ## nichenet tests (golden traces, metrics, JAX kernel)
	cd py && $(RUN) pytest -q -n 8

test-slow:       ## include slow statistical tests (e.g. tau_m* ~ tau_E^1/2)
	cd py && $(RUN) pytest -q -n 8 -m 'slow or not slow'

test-legacy:     ## checks of the thesis reference code itself
	$(LEGACY) pytest -q -p no:cacheprovider tools/legacy_oracle

golden:          ## re-record golden traces from the thesis code and from Lee et al.'s code
	$(LEGACY) python tools/legacy_oracle/make_golden.py
	$(LEE) python tools/lee_oracle/make_golden.py

bench:           ## SS step cost: numpy vs JAX
	$(RUN) python -m nichenet.bench --gpu-only --batch 1024 --steps 1000

errata:          ## erratum H1/H2 effect on evolved networks -> data/site/errata_hierarchy.json
	nice -n 10 $(RUN) python -m nichenet.experiments.errata_hierarchy

v-nl1:           ## Lee et al. Fig. 2c-d reproduction -> data/site/v_nl1.json
	nice -n 10 $(RUN) python -m nichenet.experiments.v_nl1

wheel:           ## pure-Python nichenet wheel for the browser -> web/public/py (+ manifest.json)
	rm -rf web/public/py && mkdir -p web/public/py
	$(RUN) pip wheel --no-deps -q -w web/public/py ./py
	cd web/public/py && printf '{"wheel": "%s"}\n' "$$(ls *.whl)" > manifest.json

test-pyodide: wheel  ## the wheel under Pyodide (Node) matches CPython
	$(RUN) python web/scripts/pyodide_expected.py > web/.pyodide-expected.json
	cd web && node scripts/pyodide-smoke.mjs .pyodide-expected.json

site: wheel      ## static site export -> web/out
	cd web && npm run build

serve: site      ## serve the private build locally
	$(RUN) python -m http.server -d web/out 8000
