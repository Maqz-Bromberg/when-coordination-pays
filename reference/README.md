# Reference material (not in git)

Read-only clones and sources that the tests in `tools/legacy_oracle/` and `py/tests/` are checked against.
Recreate with:

```sh
cd reference
git clone https://github.com/MaxBromberg/Networks_Via_Diffusion.git
git -C Networks_Via_Diffusion checkout 6eeb3963bb6380ee7802a4171dd60b4bb7e3460f
git clone https://github.com/MaxBromberg/Hierarchy_Coordinates.git
git -C Hierarchy_Coordinates checkout e7762fb3596b9c1c275c038db679c97bd2e64844
git clone https://github.com/MaxBromberg/network-diffusion-routing-efficiency.git
git -C network-diffusion-routing-efficiency checkout 95c520fdf6b173bdeeebe91a5fa09fafaab90c19
git clone https://github.com/eltrompetero/adaptation.git
git -C adaptation checkout f38e8c9e72314873cec98f243b832b0e9c6fe9ec
```

| Folder | Source | Commit |
|--------|--------|--------|
| `Networks_Via_Diffusion/` | 2020 thesis model code | `6eeb396` |
| `Hierarchy_Coordinates/` | standalone weighted hierarchy coordinates | `e7762fb` |
| `network-diffusion-routing-efficiency/` | standalone efficiency coordinates | `95c520f` |
| `adaptation/` | Lee, Flack & Krakauer (2024) reference code (run via `lee-ref`, `tools/lee_oracle/`) | `f38e8c9` |
| `thesis_raw/src/` | thesis LaTeX source, extracted from the author's zip (`masters thesis raw.zip`, not kept) | — |

The thesis code needs numpy < 1.24 and networkx < 3; run it only through the `nvd-legacy` conda env
(`tools/legacy_oracle/environment.yml`).
