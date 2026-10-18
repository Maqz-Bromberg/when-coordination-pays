"""Paths in the hierarchy morphospace: mean corrected (T, F, O) along each experimental variable, from existing data.

No new runs. Each group fixes everything but one variable and draws one line per level of a second factor, through the
seed-averaged coordinates at each value of the variable. Sources: V-SS (cut phi), E5 (temperature T), E6 (exponent p)
and E8 (temperature, noise, niche size and time).

    conda run -n nichenet python -m nichenet.experiments.paths
"""

import json
from collections import defaultdict
from pathlib import Path

import numpy as np

SITE = Path(__file__).resolve().parents[3].parent / "data" / "site"
OUT = SITE / "paths.json"


def load(name):
    return json.loads((SITE / f"{name}.json").read_text())


def lines(rows, line_key, var_key, coords, name=str):
    """Mean coordinates of ``rows`` grouped by line (line_key) and point (var_key), in order of the variable."""
    acc = defaultdict(list)
    for r in rows:
        acc[(line_key(r), r[var_key] if isinstance(var_key, str) else var_key(r))].append([r[c] for c in coords])
    out = defaultdict(list)
    for (ln, v), xs in sorted(acc.items(), key=lambda kv: (kv[0][0], kv[0][1])):
        m = np.mean(xs, axis=0)
        out[ln].append(dict(v=v, T=round(float(m[0]), 4), F=round(float(m[1]), 4), O=round(float(m[2]), 4), n=len(xs)))
    return [dict(name=name(k), points=pts) for k, pts in out.items()]


def e6_cell(r):
    """E6 cell names as on the E6 page."""
    budget = "per-node" if r["budget"] == "node" else "global"
    usage = "current" if r["usage"] == "flux" else f"distance κ = {r['kappa']:g}"
    return f"{budget} budget, {usage}"


def group(gid, label, section, variable, by, ls, note=""):
    return dict(id=gid, label=label, section=section, variable=variable, by=by, lines=ls, note=note)


def main():
    groups = []

    vss = load("v_ss")
    # the clean V-SS runs exist for the sparse graph with a constant source only
    for mode, density, seeding in (("faithful", "complete", "constant"), ("faithful", "complete", "random"),
                                   ("faithful", "sparse", "constant"), ("clean", "sparse", "constant"),
                                   ("faithful", "sparse", "random")):
        rows = [r for r in vss["rows"] if (r["mode"], r["density"], r["seeding"]) == (mode, density, seeding)]
        groups.append(group(f"vss-{mode}-{density}-{seeding}", f"V-SS · cut φ · {mode} · {density} · {seeding} source",
                            "V-SS", "φ", "κ",
                            lines(rows, lambda r: r["kappa"], "phi", ("T", "F", "O"), lambda k: f"κ = {k:g}")))

    e5 = load("e5")
    for pers in e5["persistence"]:
        rows = [r for r in e5["rows"] if r["persistence"] == pers]
        groups.append(group(f"e5-{pers.replace(' ', '')}", f"E5 · temperature T · {pers} source", "E5", "T", "κ",
                            lines(rows, lambda r: r["kappa"], "T", ("Tc", "Fc", "Oc"), lambda k: f"κ = {k:g}")))

    e6 = load("e6")
    for sched in ("constant", "markov", "random"):
        rows = [r for r in e6["rows"] if r["schedule"] == sched]
        groups.append(group(f"e6-{sched}", f"E6 · exponent p · {sched} source", "E6", "p", "cell",
                            lines(rows, e6_cell, "p", ("T", "F", "O"))))

    e8 = load("e8")
    rows8 = [dict(r, Tf=r["path"][-1][0], Ff=r["path"][-1][1], Of=r["path"][-1][2]) for r in e8["rows"]]
    for n in e8["ns"]:
        rows = [r for r in rows8 if r["n"] == n]
        groups.append(group(f"e8-T-N{n}", f"E8 · temperature T · N = {n}", "E8", "T", "noise ν",
                            lines(rows, lambda r: r["nu"], "T", ("Tf", "Ff", "Of"), lambda v: f"ν = {v:g}"),
                            note=f"T½ = {e8['T_half'][str(n)]:.2f}, κ = {e8['kappa']:g}"))
    for T in (0.25, 0.45):
        rows = [r for r in rows8 if r["T"] == T]
        groups.append(group(f"e8-nu-T{T}", f"E8 · noise ν · T = {T:g}", "E8", "ν", "N",
                            lines(rows, lambda r: r["n"], "nu", ("Tf", "Ff", "Of"), lambda n: f"N = {n}")))
        groups.append(group(f"e8-N-T{T}", f"E8 · niche size N · T = {T:g}", "E8", "N", "noise ν",
                            lines(rows, lambda r: r["nu"], "n", ("Tf", "Ff", "Of"), lambda v: f"ν = {v:g}")))
    seg = e8["segment"]
    for n in (10, 80):
        rows = [dict(r, step=k * seg, Tt=p[0], Ft=p[1], Ot=p[2]) for r in rows8 if r["n"] == n and r["T"] == 0.25
                for k, p in enumerate(r["path"])]
        groups.append(group(f"e8-time-N{n}", f"E8 · time · N = {n}, T = 0.25", "E8", "step", "noise ν",
                            lines(rows, lambda r: r["nu"], "step", ("Tt", "Ft", "Ot"), lambda v: f"ν = {v:g}"),
                            note="Markov source, τ_E = 300; snapshots every 300 steps from the random start"))

    OUT.write_text(json.dumps(dict(groups=groups)))
    print(f"{len(groups)} groups -> {OUT}")
    for g in groups:
        tfo = lambda q: f"({q['T']:.2f},{q['F']:.2f},{q['O']:.2f})"  # noqa: E731
        ends = ", ".join(f"{ln['name']}: {tfo(ln['points'][0])}->{tfo(ln['points'][-1])}" for ln in g["lines"])
        print(f"{g['label']}: {ends}")


if __name__ == "__main__":
    main()
