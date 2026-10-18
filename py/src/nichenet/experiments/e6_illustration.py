"""Pictures for the E6 page: one update step and the built network for each cell of the factorial.

5 x 5 lattice, constant source at a corner, same start for every cell. For each cell: the reward R of the first step
(normalized as the cell normalizes it) and the weights W after 1500 steps. Writes data/site/e6_illustration.json.

    conda run -n nichenet python -m nichenet.experiments.e6_illustration
"""

import json
from pathlib import Path

import networkx as nx
import numpy as np

from nichenet import compare

OUT = Path(__file__).resolve().parents[3].parent / "data" / "site" / "e6_illustration.json"
CELLS = [("node", "rwed", 0.0, 3.0), ("node", "rwed", 0.5, 3.0), ("node", "flux", 0.0, 2.0),
         ("global", "rwed", 0.0, 3.0), ("global", "flux", 0.0, 2.0)]
SOURCE, STEPS, ETA = 0, 1500, 0.05


def main():
    G = nx.grid_2d_graph(5, 5)
    pos = {i: [float(v[0]), float(v[1])] for i, v in enumerate(G.nodes())}
    sub = compare.Substrate(G)
    out = {"nodes": [pos[i] for i in range(sub.n)], "edges": sub.edges.tolist(), "source": SOURCE, "steps": STEPS,
           "cells": []}
    for budget, usage, kappa, p in CELLS:
        cell = compare.Cell(budget, usage, p=p, eta=ETA, kappa=kappa)
        W0 = sub.initial(budget, np.random.default_rng(0))  # same jittered start as E6
        U = sub.usage(W0, SOURCE, cell)
        R = compare.normalize(np.where(sub.mask, U ** p, 0.0), budget, sub.mask)
        W = sub.run(W0, np.full(STEPS, SOURCE), cell)
        out["cells"].append({
            "budget": budget, "usage": usage, "kappa": kappa, "p": p,
            "reward": R.tolist(), "weights": W.tolist(), "loops": sub.loops(W),
        })
    OUT.write_text(json.dumps(out))
    print(f"-> {OUT}")


if __name__ == "__main__":
    main()
