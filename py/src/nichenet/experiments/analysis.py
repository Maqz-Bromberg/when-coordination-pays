"""Numbers behind A2-A4 (docs/results.md, "Coordination" section): spectra of the anchored SS map across T, separatrix
agreement below T = kappa, and the noisy mean field against E8.

    conda run -n nichenet python -m nichenet.experiments.analysis
"""

import json
from pathlib import Path

import numpy as np

from nichenet.continuum import analysis as an
from nichenet.continuum import large_delta as ld
from nichenet.core import graphs
from nichenet.ss import SSParams, run, schedules

SITE = Path(__file__).resolve().parents[3].parent / "data" / "site"
OUT = SITE / "analysis.json"


def symmetric_state(n, kappa, T):
    """The symmetric fixed point (source 0): every other node puts x* on the source and the rest evenly on its peers.
    For T < kappa this is the unstable interior point u* = rho^((1-kappa)/(T-kappa)) < 1, not the condensed state."""
    u = 2.6 ** ((1 - kappa) / (T - kappa))
    x = u / (u + n - 2)
    W = np.full((n, n), (1 - x) / (n - 2))
    W[0, :] = x
    W[:, 0] = 1.0 / (n - 1)
    np.fill_diagonal(W, 0.0)
    return W, x


def spectra(n=10, kappa=0.3, temps=(0.1, 0.15, 0.2, 0.25, 0.4, 0.45, 0.6, 0.8, 1.0, 1.2)):
    rows = []
    mask = ~np.eye(n, dtype=bool)
    for T in temps:
        p = SSParams.clean(kappa, 0.0, selection="tempered", temperature=T)
        W, x = symmetric_state(n, kappa, T)
        resid = float(np.abs(an.ss_map(W, 0, p, mask, anchor=1) - W).max())
        h = min(1e-6, 1e-3 * W[mask].min())  # keep perturbed weights positive near condensation
        ev = an.tangent_jacobian(W, 0, p, mask, h=h, anchor=1)
        bulk = ld.contraction(kappa, T)
        rows.append(dict(T=T, x_star=x, radius=float(ev[0]), bulk=float(bulk), second=float(ev[1]),
                         n_bulk=int(np.sum(np.isclose(ev, bulk, atol=1e-6))), n_modes=len(ev), residual=resid,
                         top=[round(float(v), 5) for v in ev[:6]]))
        print(f"A2 T={T:4.2f}: x*={x:.3f} radius {ev[0]:.4f} bulk {bulk:.4f} ({rows[-1]['n_bulk']}/{len(ev)})  "
              f"top {rows[-1]['top']}  fixed-point residual {resid:.1e}")
    return dict(n=n, kappa=kappa, rows=rows)


def separatrix(n=20, kappas=(0.4, 0.6, 0.8), seeds=(0, 1, 2), steps=600):
    rows = []
    for kappa in kappas:
        for T, sel in [(round(kappa * f, 3), "tempered") for f in (0.25, 0.5, 0.75)] + [(0.0, "cut")]:
            agree, pred_lock, obs_lock = [], [], []
            for seed in seeds:
                rng = np.random.default_rng(seed)
                A0 = graphs.uniform_random(n, rng)
                p = (SSParams.clean(kappa, 0.0, selection="tempered", temperature=T) if sel == "tempered"
                     else SSParams.clean(kappa, 1.0))
                A = run(A0, schedules.constant(steps, 0), p)["A"]
                ratio = an.separatrix_ratio(kappa, max(T, 1e-12))
                for i in range(1, n):
                    col = A0[:, i].copy()
                    ws = col[0]
                    col[[0, i]] = -1
                    pl = bool(col.max() / ws > ratio)
                    ol = int(np.argmax(np.where(np.arange(n) == i, -1, A[:, i]))) != 0
                    agree.append(pl == ol)
                    pred_lock.append(pl)
                    obs_lock.append(ol)
            rows.append(dict(kappa=kappa, T=T, selection=sel, ratio=float(ratio), agreement=float(np.mean(agree)),
                             predicted_locked=float(np.mean(pred_lock)), observed_locked=float(np.mean(obs_lock))))
            r = rows[-1]
            print(f"A3 kappa={kappa} {sel:8s} T={T:5.3f}: ratio {ratio:6.2f}  agreement {r['agreement']:.2f}  "
                  f"locked predicted {r['predicted_locked']:.2f} observed {r['observed_locked']:.2f}")
    return dict(n=n, steps=steps, rows=rows)


def mean_field(temps=(0.25, 0.3, 0.45, 0.6)):
    e8 = json.loads((SITE / "e8.json").read_text())
    rows = []
    for n in e8["ns"]:
        for nu in e8["nus"]:
            for T in temps:
                sel = [r for r in e8["rows"] if (r["n"], r["nu"], r["T"]) == (n, nu, T)]
                roots = an.noisy_fixed_points(n, e8["kappa"], T, nu)
                stable = [x for x, s in roots if s]
                rows.append(dict(n=n, nu=nu, T=T, sim=float(np.mean([r["tracking"] for r in sel])),
                                 averaged=max(stable) if stable else None, n_stable=len(stable),
                                 walk=an.noisy_symmetric_walk(n, e8["kappa"], T, nu),
                                 relay=an.relay_walk(n, e8["kappa"], T, nu)))
                r = rows[-1]
                avg = f"{r['averaged']:.3f}" if r["averaged"] is not None else "  -  "
                print(f"A4 N={n:2d} nu={nu:.2f} T={T:.2f}: E8 {r['sim']:.3f}  averaged {avg} ({len(stable)} stable)  "
                      f"walk {r['walk']:.3f}  relay {r['relay']:.3f}")
    return dict(kappa=e8["kappa"], rows=rows)


def crossing(f, lo, hi, iters=40):
    """T in (lo, hi) at which the decreasing attention f(T) crosses 1/2, or None if it never does."""
    if f(lo) < 0.5 or f(hi) > 0.5:
        return None
    for _ in range(iters):
        mid = np.sqrt(lo * hi)
        lo, hi = (mid, hi) if f(mid) > 0.5 else (lo, mid)
    return float(np.sqrt(lo * hi))


def noisy_t_half():
    """T at which tracking falls to 1/2, against noise: averaged mean field, relay-aware walk and E8 (log-linear
    interpolation between the sampled temperatures). With nu = 0 all equal the closed-form T_half."""
    e8 = json.loads((SITE / "e8.json").read_text())
    kappa, rows = e8["kappa"], []
    for n in e8["ns"]:
        for nu in e8["nus"]:
            def averaged(T, n=n, nu=nu):
                stable = [x for x, st in an.noisy_fixed_points(n, kappa, T, nu) if st]
                # a root closer to 1 than the grid resolves: E[r] > x at the top of the grid
                top = 1.0 if an.noisy_expected_reward(1 - 1e-6, n, kappa, T, nu) > 1 - 1e-6 else 0.0
                return max(stable, default=top)

            avg = crossing(averaged, kappa + 0.02, 2.0)
            relay = crossing(lambda T, n=n, nu=nu: an.relay_walk(n, kappa, T, nu, steps=6000, burn=1000),
                             kappa + 0.02, 2.0, 16)
            temps = [T for T in e8["temps"] if T > kappa]
            trk = [np.mean([r["tracking"] for r in e8["rows"] if (r["n"], r["nu"], r["T"]) == (n, nu, T)])
                   for T in temps]
            sim = None
            for T0, y0, T1, y1 in zip(temps, trk, temps[1:], trk[1:], strict=False):
                if y0 >= 0.5 > y1:
                    sim = float(np.exp(np.log(T0) + (y0 - 0.5) / (y0 - y1) * (np.log(T1) - np.log(T0))))
                    break
            rows.append(dict(n=n, nu=nu, closed=float(ld.T_half(n, kappa)), averaged=avg, relay=relay, sim=sim))
            f = lambda v: "  -  " if v is None else f"{v:.3f}"  # noqa: E731
            print(f"T_half N={n:2d} nu={nu:.2f}: closed {ld.T_half(n, kappa):.3f}  averaged {f(avg)}  "
                  f"relay {f(relay)}  E8 {f(sim)}")
    return dict(kappa=kappa, rows=rows)


def main():
    OUT.write_text(json.dumps(dict(spectra=spectra(), separatrix=separatrix(), mean_field=mean_field(),
                                   t_half=noisy_t_half())))
    print(f"-> {OUT}")


if __name__ == "__main__":
    main()
