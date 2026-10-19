"""Record golden traces from the 2020 thesis code for nichenet's faithful mode.

Run in the legacy env:
    conda run -n nvd-legacy python tools/legacy_oracle/make_golden.py
Writes py/tests/golden/ss_traces.npz and efficiency.npz, and hierarchy-coordinates/tests/golden/thesis_code.npz.

Seeding is replaced by an explicit source list (the thesis code's random seeding is unseeded and its
constant_source_node=0 means "random"), so both implementations see identical sources.
"""

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
# isort: off
from shim import REPO_ROOT, efficiency_coordinates, graph
import hierarchy_coordinates as hc
# isort: on

OUT = REPO_ROOT / "py" / "tests" / "golden"
STEPS = 15
BASE = dict(n=14, init="uniform", k=None, delta=10.0, source_reward=2.6, coupled=True, update_interval=1,
            eff_dist_to_source=False, positive_correlation=False, adapt_outgoing=False,
            conserve_incoming=True, undirected=False)

DIRECTIONS = [  # grid_search_control.directionality_dic
    {},
    dict(eff_dist_to_source=True, positive_correlation=True, adapt_outgoing=True, conserve_incoming=False),
    dict(adapt_outgoing=True, conserve_incoming=False),
    dict(eff_dist_to_source=True, positive_correlation=True, conserve_incoming=False),
    dict(eff_dist_to_source=True, positive_correlation=True, adapt_outgoing=True),
    dict(eff_dist_to_source=True, positive_correlation=True),
    dict(adapt_outgoing=True),
    dict(conserve_incoming=False),
]

CASES = (
    [dict(kappa=k, phi=f) for k, f in [(0.0, 0.0), (0.0, 0.9), (0.3, 0.5), (0.5, 0.0), (0.7, 0.9),
                                        (1.0, 1.0), (0.95, 1.0), (0.2, 0.8), (0.35, 0.35)]]
    + [dict(kappa=k, phi=f, init="sparse", k=3) for k, f in [(0.5, 0.5), (0.5, 0.9), (0.0, 0.5), (0.8, 1.0)]]
    + [dict(kappa=0.4, phi=0.6, coupled=False), dict(kappa=0.4, phi=0.0, coupled=False)]
    + [dict(kappa=0.3, phi=0.7, **d) for d in DIRECTIONS[1:]]
    + [dict(kappa=0.3, phi=0.7, undirected=True)]
    + [dict(kappa=0.3, phi=0.7, update_interval=3), dict(kappa=0.6, phi=0.0, update_interval=4)]
    + [dict(kappa=0.3, phi=0.7, delta=1.0), dict(kappa=0.5, phi=0.0, delta=0.5)]
    + [dict(kappa=0.5, phi=0.9, source_reward=1.2)]
)


def initial_matrix(cfg, rng):
    n = cfg["n"]
    if cfg["init"] == "uniform":
        A = rng.random((n, n))
    else:  # k equal-weight out-edges per node, distinct targets, every column non-empty
        A = np.zeros((n, n))
        for node in range(n):
            A[node, rng.choice(np.delete(np.arange(n), node), size=cfg["k"], replace=False)] = 1.0
        for j in np.flatnonzero(A.sum(0) == 0):
            A[rng.choice(np.delete(np.arange(n), j)), j] = 1.0
    np.fill_diagonal(A, 0.0)
    return A / A.sum(1, keepdims=True)  # the thesis code normalizes rows at initialization


def run_reference(cfg, A0, sources):
    G = graph.Graph(cfg["n"], edge_conservation_coefficient=cfg["kappa"], selectivity=cfg["phi"],
                    reinforcement_info_score_coupling=cfg["coupled"],
                    positive_eff_dist_and_reinforcement_correlation=cfg["positive_correlation"],
                    eff_dist_is_towards_source=cfg["eff_dist_to_source"],
                    nodes_adapt_outgoing_edges=cfg["adapt_outgoing"],
                    incoming_edges_conserved=cfg["conserve_incoming"], undirected=cfg["undirected"])
    G.A[-1] = A0
    it = iter(int(s) for s in sources)

    def seed(*_args, **_kwargs):
        G._source_node = next(it)
        G.source_node_history.append(G._source_node)

    G.seed_info_conditional = seed
    G.simulate(num_runs=len(sources), eff_dist_delta_param=cfg["delta"], update_interval=cfg["update_interval"],
               source_reward=cfg["source_reward"], equilibrium_distance=0)
    return G.A.copy(), np.array(G.eff_dist_to_source_history), G.get_num_errors()


def ss_traces():
    rng = np.random.default_rng(2020)
    data, meta = {}, []
    for c, case in enumerate(CASES):
        cfg = {**BASE, **case}
        A0 = initial_matrix(cfg, rng)
        sources = rng.integers(cfg["n"], size=STEPS)
        A_hist, ed_hist, errors = run_reference(cfg, A0, sources)
        data[f"A_hist_{c}"] = A_hist
        data[f"ed_hist_{c}"] = ed_hist
        data[f"sources_{c}"] = sources
        meta.append({**cfg, "errors": int(errors)})
    data["meta"] = np.array(json.dumps(meta))
    np.savez_compressed(OUT / "ss_traces.npz", **data)
    print(f"ss_traces: {len(CASES)} cases")


def metric_inputs():
    rng = np.random.default_rng(7)
    n = 9
    star = np.zeros((n, n))
    star[0, 1:] = 1.0
    chain = np.diag(np.ones(n - 1), 1)
    cycle = np.roll(np.eye(n), 1, axis=1)
    tree = np.zeros((n, n))
    tree[0, 1] = tree[0, 2] = tree[1, 3] = tree[1, 4] = tree[2, 5] = tree[2, 6] = 1
    tree[3, 7] = tree[4, 8] = 1
    rand_w = rng.random((n, n))
    np.fill_diagonal(rand_w, 0)
    sparse_w = rand_w * (rng.random((n, n)) < 0.3)
    near_star = 0.02 * rand_w
    near_star[0, 1:] += 1.0
    traces = np.load(OUT / "ss_traces.npz")
    evolved = [traces[f"A_hist_{c}"][-1] for c in (2, 4, 6)]
    return {"star": star, "chain": chain, "cycle": cycle, "tree": tree, "rand_w": rand_w, "sparse_w": sparse_w,
            "near_star": near_star, **{f"evolved_{i}": A for i, A in enumerate(evolved)}}


def hierarchy():
    data = {}
    for name, A in metric_inputs().items():
        data[f"A_{name}"] = A
        data[f"lin_{name}"] = np.array(hc.average_hierarchy_coordinates(A, exp_threshold_distribution=None))
        data[f"exp_{name}"] = np.array(hc.average_hierarchy_coordinates(A, exp_threshold_distribution=0.5))
    np.savez_compressed(REPO_ROOT / "hierarchy-coordinates" / "tests" / "golden" / "thesis_code.npz", **data)
    print(f"hierarchy: {len(data) // 3} matrices (order: orderability, feedforwardness, treeness)")


def efficiency():
    # n = 14: at small n the seeded G(n, 1/2) comparison graphs used for normalization can contain a node
    # without out-edges, which the thesis RWED rejects.
    rng = np.random.default_rng(11)
    n = 14
    rand_w = rng.random((n, n))
    np.fill_diagonal(rand_w, 0)
    near_star = 0.02 * rand_w
    near_star[0, 1:] += 1.0
    traces = np.load(OUT / "ss_traces.npz")
    inputs = {"rand_w": rand_w, "near_star": near_star,
              **{f"evolved_{i}": traces[f"A_hist_{c}"][-1] for i, c in enumerate((2, 4, 6))}}
    data = {}
    for name, A in inputs.items():
        data[f"A_{name}"] = A
        data[f"raw_{name}"] = np.array([efficiency_coordinates.E_diff(A, normalize=False),
                                        efficiency_coordinates.E_rout(A, normalize=False)])
        data[f"norm_{name}"] = np.array([efficiency_coordinates.E_diff(A, normalize=True),
                                         efficiency_coordinates.E_rout(A, normalize=True)])
    np.savez_compressed(OUT / "efficiency.npz", **data)
    print(f"efficiency: {len(data) // 3} matrices")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    ss_traces()
    hierarchy()
    efficiency()
