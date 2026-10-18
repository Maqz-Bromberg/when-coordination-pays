"""Generate the paper's LaTeX tables from data/site/*.json, so every number in a table comes from the runs.

    conda run -n nichenet python paper/tables.py
"""

import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "site"
OUT = ROOT / "paper" / "generated"
OUT.mkdir(exist_ok=True)


def load(name):
    return json.loads((DATA / f"{name}.json").read_text())


def f(x, d=2):
    return "--" if x is None else f"{x:.{d}f}"


def table(name, spec, header, rows):
    body = "\n".join(" & ".join(str(c) for c in r) + r" \\" for r in rows)
    (OUT / f"{name}.tex").write_text(
        f"\\begin{{tabular}}{{{spec}}}\n\\toprule\n{header} \\\\\n\\midrule\n{body}\n\\bottomrule\n\\end{{tabular}}\n")


def e8():
    d = load("e8")
    rows = d["rows"]

    def cell(n, nu, T):
        s = [r for r in rows if (r["n"], r["nu"], r["T"]) == (n, nu, T)]
        return {k: np.mean([r[k] for r in s]) for k in ("benefit", "cost", "tracking")}

    out = []
    for n in d["ns"]:
        for nu in d["nus"]:
            T, c = max(((T, cell(n, nu, T)) for T in d["temps"]), key=lambda x: x[1]["benefit"])
            out.append([n if nu == 0 else "", f(nu), f(T), f(d["T_half"][str(n)]), f(c["benefit"]), f(c["benefit"] / np.log(n - 1)),
                        f(c["cost"]), f(c["benefit"] / c["cost"]), f(c["tracking"])])
    table("e8", "rrrrrrrrr", r"$N$ & $\nu$ & best $T$ & $T_{1/2}$ & benefit & /$\ln(N{-}1)$ & cost & benefit/cost & tracking", out)


def thalf():
    rows = load("analysis")["t_half"]["rows"]
    out = []
    for n in sorted({r["n"] for r in rows}):
        for k, lab in (("sim", "simulation"), ("relay", "relay-aware walk"), ("averaged", "averaged theory")):
            vals = [next(r for r in rows if r["n"] == n and r["nu"] == nu) for nu in (0.0, 0.25, 0.5, 0.75)]
            out.append([n if k == "sim" else "", f(vals[0]["closed"], 3)] + [f(v[k], 3) for v in vals[1:]] + [lab])
    table("thalf", "rrrrrl", r"$N$ & $T_{1/2}$ ($\nu{=}0$) & $\nu{=}0.25$ & $\nu{=}0.5$ & $\nu{=}0.75$ & from", out)


def a4():
    rows = [r for r in load("a4_test")["rows"] if r["T"] == 0.25]
    out = [[r["n"], f(r["nu"]), f(r["rwed"], 3), f(r["rwed_sym"], 3), f(r["relay_walk"], 3), f(r["column_rwed"], 3),
            f(r["likelihood"], 3), f(r["likelihood_sym"], 3), f(r["sym_walk"], 3), f(r["competition_lik"])] for r in rows]
    table("a4", "rrrrrrrrrr", r"$N$ & $\nu$ & \multicolumn{4}{c}{reward position} & \multicolumn{3}{c}{reward evidence} & competition \\"
          r" & & free & equal & relay walk & column & free & equal & sym.\ walk &", out)


def meanfield():
    rows = [r for r in load("analysis")["mean_field"]["rows"] if r["nu"] > 0 and r["T"] in (0.25, 0.3, 0.45)]
    out = [[r["n"], f(r["nu"]), f(r["T"]), f(r["sim"], 3), f(r["averaged"], 3), f(r["walk"], 3), f(r["relay"], 3)] for r in rows]
    table("meanfield", "rrrrrrr", r"$N$ & $\nu$ & $T$ & simulation & averaged & walk & relay walk", out)


def e9():
    d = load("e9")
    rows = d["rows"]
    names = {"rwed": "position", "lik-rho": "evidence", "lik-bayes": "evidence, tuned", "bayes": "ideal statistician"}

    def m(rule, n, nu, T, k):
        return np.mean([r[k] for r in rows if r["rule"] == rule and r["n"] == n and r["nu"] == nu and (rule == "bayes" or r["T"] == T)])

    out = []
    for n in (10, 80):
        for nu in (0.25, 0.5, 0.75):
            for rule, lab in names.items():
                T = None if rule == "bayes" else max(d["temps"], key=lambda t: m(rule, n, nu, t, "benefit"))
                out.append([n, f(nu), lab, "--" if T is None else f(T), f(m(rule, n, nu, T, "benefit") / np.log(n - 1)),
                            f(m(rule, n, nu, T, "tracking")), f(m(rule, n, nu, T, "cost")), f(m(rule, n, nu, T, "info_cost"))])
    table("e9", "rrlrrrrr", r"$N$ & $\nu$ & rule & best $T$ & benefit/$\ln(N{-}1)$ & tracking & struct.\ cost & info.\ cost", out)


def spectra():
    s = load("analysis")["spectra"]
    out = [[f(r["T"]), f(r["x_star"], 3), f(r["bulk"], 4), f(r["radius"], 4), f"{r['n_bulk']}/{r['n_modes']}", "yes" if r["radius"] < 1 else "no"]
           for r in s["rows"]]
    table("spectra", "rrrrrl", r"$T$ & $x^*$ & bulk rate & spectral radius & modes at bulk & stable", out)


def separatrix():
    s = load("analysis")["separatrix"]
    out = [[f(r["kappa"]), r["selection"], r"$\to 0$" if r["selection"] == "cut" else f(r["T"], 3), f(r["ratio"]), f(r["agreement"]),
            f(r["predicted_locked"]), f(r["observed_locked"])] for r in s["rows"]]
    table("separatrix", "rlrrrrr", r"$\kappa$ & selection & $T$ & threshold & agreement & locked (pred.) & locked (obs.)", out)


def e4():
    out = [[c["type"], int(c["tau_E"]), f(c["fixed_point"]), f(c["BR_slope"]), int(round(c["tau_eff_at_fixed"])), f(c["self_optimum"])]
           for c in load("e4")["cases"]]
    table("e4", "lrrrrr", r"type & $\tau_E$ & stable memory & BR slope & effective pace & group optimum", out)


def e3():
    d = load("e3")
    out = []
    for tau in d["tau_Es"]:
        for a in sorted({r["a"] for r in d["rows"]}):
            s = [r for r in d["rows"] if r["a"] == a and r["tau_E"] == tau]
            out.append([int(tau), f(a, 1), f(np.mean([r["mean_tenure"] for r in s])), f"{np.mean([r['n_takeovers'] for r in s]):.0f}"])
    table("e3", "rrrr", r"$\tau_E$ & payment $a$ & hub tenure (epochs) & takeovers", out)


def e1():
    a, b = load("e1"), load("e1_kappa")
    out = [[r["tau_E"], f(r["tau_m_star"]), f(q["tau_m_star"])] for r, q in zip(a["rows"], b["rows"], strict=True)]
    out.append([r"slope", f(a["slope_tau_m"]), f(b["slope_tau_m"])])
    table("e1", "rrr", r"$\tau_E$ & $\tau_m^*$ (memory via $\varepsilon$) & $\tau_m^*$ (via $\kappa$)", out)


if __name__ == "__main__":
    for fn in (e8, thalf, a4, meanfield, e9, spectra, separatrix, e4, e3, e1):
        fn()
    print("tables ->", OUT, sorted(p.name for p in OUT.iterdir()))


def glossary():
    """The site's glossary (site/app/lib/glossary.ts) as a LaTeX description list, grouped by source."""
    import re
    src = (ROOT / "site" / "app" / "lib" / "glossary.ts").read_text()
    groups = re.findall(r'\{ id: "(\w+)", label: "([^"]+)", source: "([^"]+)"', src)
    entries = re.findall(r'(\w+): \{\s*group: "(\w+)", term: "([^"]+)",\s*def: "((?:[^"\\]|\\.)*)"', src)

    def tex(t):
        t = t.replace("\\", "").replace("&", r"\&").replace("%", r"\%").replace("#", r"\#").replace("_", r"\_")
        t = re.sub(r"\^\(([^)]*)\)", r"\\textsuperscript{\1}", t)
        return t.replace("~", r"\textasciitilde{}").replace("^", r"\^{}")

    out = []
    for gid, label, source in groups:
        out.append(f"\\subsection*{{{tex(label)}}}\\noindent\\emph{{{tex(source)}}}\n\\begin{{description}}[font=\\normalfont\\bfseries,itemsep=1pt]")
        for _, g, term, d in entries:
            if g == gid:
                out.append(f"  \\item[{tex(term)}] {tex(d)}")
        out.append("\\end{description}")
    (OUT / "glossary.tex").write_text("\n".join(out) + "\n")


if __name__ == "__main__":
    glossary()
