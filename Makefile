# All Python runs through conda envs (environment.yml, tools/legacy_oracle/environment.yml).
RUN    = conda run --no-capture-output -n nichenet
LEGACY = conda run --no-capture-output -n nvd-legacy
LEE    = conda run --no-capture-output -n lee-ref
export XLA_PYTHON_CLIENT_PREALLOCATE = false

.PHONY: envs test test-slow test-legacy golden bench errata v-nl1 public figures tables paper release serve-public

envs:            ## create the three conda envs and install nichenet in editable mode (with hierarchy-coordinates)
	conda env create -f environment.yml
	conda env create -f tools/legacy_oracle/environment.yml
	conda env create -f tools/lee_oracle/environment.yml
	$(RUN) pip install -e "py[experiments]"

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

# ---------------------------------------------------------------- public site and paper
# The public site (site/) is a static export for GitHub Pages; the paper (paper/) takes its figures from that site and
# its tables from data/site. CI does the same steps (.github/workflows/pages.yml).
FIGPORT = 8766

public:          ## public site static export -> site/out
	cd site && npm run build

figures: public  ## export every site figure as PDF -> paper/figures
	$(RUN) python -m http.server -d site/out $(FIGPORT) >/dev/null 2>&1 & echo $$! > .figserver.pid; \
	sleep 1; cd site && node scripts/export-figures.mjs http://127.0.0.1:$(FIGPORT)/ ../paper/figures; \
	status=$$?; kill $$(cat ../.figserver.pid); rm -f ../.figserver.pid; exit $$status

tables:          ## paper tables and glossary from data/site and the site glossary -> paper/generated
	$(RUN) python paper/tables.py

paper: tables    ## the consolidated paper -> paper/build/main.pdf (run `make figures` first after site changes)
	cd paper && latexmk -interaction=nonstopmode -halt-on-error main.tex

release: figures paper  ## site with the paper bundled -> site/out (what CI deploys)
	cp paper/build/main.pdf site/out/paper.pdf
	cp paper/build/main.pdf site/public/paper.pdf

serve-public:    ## serve the public build locally
	$(RUN) python -m http.server -d site/out 8001
