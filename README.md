# Churn, Niches and Hierarchy

Implements the program in [PLAN.md](PLAN.md): the 2020 source-to-structure model (Bromberg 2020), optimal learning
in noisy niches (Lee, Flack & Krakauer 2024) and adaptive transport networks, as one Python package (`py/`,
`nichenet`) with a private research site (`web/`), a public site (`site/`) and a consolidated paper (`paper/`).

```sh
make envs          # conda envs: nichenet (main) and nvd-legacy (runs the thesis code as an oracle)
make test          # nichenet tests, incl. golden traces recorded from the thesis code
make test-legacy   # checks of the thesis code's own behaviour
make site serve    # build and serve the private site on localhost:8000
make release       # public site + figures exported from it + tables + paper, bundled -> site/out
make serve-public  # serve the public build on localhost:8001
```

- `py/src/nichenet/ss/`: SS model. `model.py` is the numpy reference (faithful and clean modes);
  `jax_kernel.py` is the batched GPU path for sweeps.
- `py/src/nichenet/metrics/`: hierarchy coordinates (Corominas-Murtra et al. 2013; the thesis variant is
  kept for comparison) and efficiency coordinates.
- `docs/errata.md`: errors and implementation behaviours found in the thesis code, each with a test.
- `tools/legacy_oracle/`: the env, shim and recorder for the thesis code. `reference/` (not in git) holds the clones;
  see `reference/README.md`.
- Papers live in `papers/` and are not in git.

## Public site and paper

- `site/`: the public, chaptered Next.js site ("When coordination pays"), a static export for GitHub Pages. `BASE_PATH`
  sets the repository path at build time. Hover cards, the enlarged-figure lightbox and the scroll bar are adapted from
  remystifying-science (provenance lines at the top of each file). Appendix pages are rendered from `docs/`.
- `paper/`: the consolidated LaTeX article (LuaLaTeX, `latexmkrc`). Its figures are printed from the site by
  `site/scripts/export-figures.mjs`, its tables generated from `data/site/` by `paper/tables.py`, its glossary from the
  site's glossary; none of these outputs are in git.
- `.github/workflows/pages.yml` builds the site, the figures and the paper, bundles the paper as `/paper.pdf`, and
  deploys to GitHub Pages. To publish: create the GitHub repository, push, and set Pages to "GitHub Actions".
