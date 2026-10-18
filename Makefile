# All Python runs through conda envs (environment.yml, tools/legacy_oracle/environment.yml).
RUN    = conda run --no-capture-output -n nichenet
LEGACY = conda run --no-capture-output -n nvd-legacy
export XLA_PYTHON_CLIENT_PREALLOCATE = false

.PHONY: envs test test-legacy golden bench errata site serve

envs:            ## create both conda envs and install nichenet in editable mode
	conda env create -f environment.yml
	conda env create -f tools/legacy_oracle/environment.yml
	$(RUN) pip install -e py

test:            ## nichenet tests (golden traces, metrics, JAX kernel)
	cd py && $(RUN) pytest -q -n 8

test-legacy:     ## checks of the thesis reference code itself
	$(LEGACY) pytest -q -p no:cacheprovider tools/legacy_oracle

golden:          ## re-record golden traces from the thesis code
	$(LEGACY) python tools/legacy_oracle/make_golden.py

bench:           ## SS step cost: numpy vs JAX
	$(RUN) python -m nichenet.bench --gpu-only --batch 1024 --steps 1000

errata:          ## erratum H1/H2 effect on evolved networks -> data/site/errata_hierarchy.json
	nice -n 10 $(RUN) python -m nichenet.experiments.errata_hierarchy

site:            ## static site export -> web/out
	cd web && npm run build

serve: site      ## serve the private build locally
	$(RUN) python -m http.server -d web/out 8000
