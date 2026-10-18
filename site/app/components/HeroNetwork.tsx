"use client";
/** A live, simplified run of the model behind the title: 18 agents split attention; each round the news lands on the
 *  true source or (25%) on a random agent; links to the seeded agent are rewarded (factor ρ), strong links are
 *  reinforced (κ), rewards are tempered (T) and blended in (ε). The true source moves every ~7 s. Colours are read
 *  from the theme tokens at runtime. The loop parks when the hero is off-screen and does not run under reduced motion. */
import { useEffect, useRef } from "react";

const N = 18, KAPPA = 0.2, T = 0.27, EPS = 0.45, RHO = 2.6, NU = 0.25, STEP_MS = 110, MOVE_EVERY = 64;

export default function HeroNetwork() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0, visible = true, last = 0, step = 0, source = 3, seed = 3, flash = 0;
    let seedRng = 12345;
    const rnd = () => { seedRng = (seedRng * 1664525 + 1013904223) % 4294967296; return seedRng / 4294967296; };
    // attention A[k][i]: how much agent i listens to agent k (columns sum to 1)
    const A = Array.from({ length: N }, (_, k) => Array.from({ length: N }, (_, i) => (k === i ? 0 : (0.6 + 0.8 * rnd()))));
    for (let i = 0; i < N; i++) { let s = 0; for (let k = 0; k < N; k++) s += A[k][i]; for (let k = 0; k < N; k++) A[k][i] /= s; }
    const pos = Array.from({ length: N }, (_, i) => {
      const a = (2 * Math.PI * i) / N + 0.3 * (rnd() - 0.5), r = 0.62 + 0.3 * rnd();
      return [Math.cos(a) * r, Math.sin(a) * r * 0.78];
    });
    const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";

    const update = () => {
      step++;
      if (step % MOVE_EVERY === 0) source = (source + 1 + Math.floor(rnd() * (N - 1))) % N;
      seed = rnd() < NU ? Math.floor(rnd() * N) : source;
      if (seed !== source) flash = 1;
      for (let i = 0; i < N; i++) {
        let tot = 0;
        const r = new Array(N).fill(0);
        for (let k = 0; k < N; k++) {
          if (k === i) continue;
          const s = (k === seed ? Math.pow(RHO, 1 - KAPPA) : 1) * Math.pow(A[k][i], KAPPA);
          r[k] = Math.pow(s, 1 / T); tot += r[k];
        }
        for (let k = 0; k < N; k++) if (k !== i) A[k][i] = (A[k][i] + EPS * r[k] / tot) / (1 + EPS);
      }
    };

    const draw = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // wide: the network sits to the right of the title; narrow: above it, clear of the text
      const narrow = w < 700;
      const cx = narrow ? w * 0.5 : w * (w > 900 ? 0.7 : 0.62), cy = narrow ? 150 : h * 0.46;
      const R = narrow ? Math.min(w * 0.42, 125) : Math.min(w * (w > 900 ? 0.28 : 0.34), h * 0.55);
      const P = pos.map(([x, y]) => [cx + x * R, cy + y * R]);
      const ink = css("--muted"), acc = css("--ss"), bad = css("--ob"), hub = css("--ink");
      ctx.lineCap = "round";
      for (let i = 0; i < N; i++) for (let k = 0; k < N; k++) {
        const a = A[k][i];
        if (k === i || a < 0.04) continue;
        ctx.strokeStyle = k === source ? acc : ink;
        ctx.globalAlpha = Math.min(0.85, 0.12 + a * 0.9);
        ctx.lineWidth = 0.6 + a * 3.2;
        ctx.beginPath(); ctx.moveTo(P[k][0], P[k][1]); ctx.lineTo(P[i][0], P[i][1]); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const inAtt = A.map((row) => row.reduce((s, x) => s + x, 0) / (N - 1));
      for (let k = 0; k < N; k++) {
        const r = 3.5 + 11 * Math.sqrt(inAtt[k]);
        ctx.fillStyle = k === source ? acc : inAtt[k] > 0.3 ? hub : ink;
        ctx.beginPath(); ctx.arc(P[k][0], P[k][1], r, 0, 2 * Math.PI); ctx.fill();
        if (k === seed && seed !== source && flash > 0) {
          ctx.strokeStyle = bad; ctx.globalAlpha = flash; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.arc(P[k][0], P[k][1], r + 6, 0, 2 * Math.PI); ctx.stroke();
          ctx.setLineDash([]); ctx.globalAlpha = 1;
        }
      }
      flash = Math.max(0, flash - 0.08);
    };

    const loop = (t: number) => {
      if (!visible) { raf = 0; return; }
      if (t - last > STEP_MS) { update(); last = t; }
      draw();
      raf = requestAnimationFrame(loop);
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (let s = 0; s < 40; s++) update();
    draw();
    if (reduce) return;
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => { io.disconnect(); cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);
  return <canvas ref={ref} aria-hidden />;
}
