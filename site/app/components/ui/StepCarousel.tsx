"use client";
// Adapted from remystifying-science app/components/article/appendix-carousel.tsx @ f578288.
// Changes: owns its active step; previous/next buttons; ←/→ while it has focus (the event is marked handled so the
// chapter navigation does not also fire); slides move in the direction of travel; every segment is a labelled
// button of at least 44 px (touch rule 19 of the source, kept). For the paper's figure export (window.__EXPORT_ALL__)
// all steps render stacked.
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type Step = { key: string; label: string; node: ReactNode };
const SWIPE_THRESHOLD_PX = 40;

export default function StepCarousel({ items, label }: { items: Step[]; label: string }) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [all, setAll] = useState(false);
  const reduce = useReducedMotion();
  const touch = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { setAll(Boolean((window as unknown as { __EXPORT_ALL__?: boolean }).__EXPORT_ALL__)); }, []);
  const go = (j: number) => { const k = Math.max(0, Math.min(items.length - 1, j)); setDir(k >= i ? 1 : -1); setI(k); };

  if (all) {
    return (
      <div className="sc sc-all">
        {items.map((it, j) => (
          <section key={it.key} className="sc-slide"><div className="sc-step">Step {j} · {it.label}</div>{it.node}</section>
        ))}
      </div>
    );
  }

  return (
    <div className="sc" role="region" aria-roledescription="carousel" aria-label={label} tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" && i < items.length - 1) { e.preventDefault(); go(i + 1); }
        if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); go(i - 1); }
      }}
      onTouchStart={(e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; }}
      onTouchEnd={(e) => {
        if (!touch.current) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touch.current.x, dy = t.clientY - touch.current.y;
        touch.current = null;
        if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;
        go(dx < 0 ? i + 1 : i - 1);
      }}>
      <div className="sc-nav">
        <button type="button" className="icon-btn" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous step"><ChevronLeft size={16} /></button>
        <div className="sc-segments" role="tablist">
          {items.map((it, j) => (
            <button key={it.key} type="button" role="tab" aria-selected={j === i} className={j === i ? "sc-seg active" : "sc-seg"} onClick={() => go(j)}>
              <span className="sc-seg-n">{j}</span> {it.label}
            </button>
          ))}
        </div>
        <button type="button" className="icon-btn" onClick={() => go(i + 1)} disabled={i === items.length - 1} aria-label="Next step"><ChevronRight size={16} /></button>
      </div>
      <div className="sc-stage">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div key={items[i].key} className="sc-slide" role="tabpanel" aria-label={`Step ${i}: ${items[i].label}`}
            custom={dir}
            initial={reduce ? false : { opacity: 0, x: 36 * dir }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0, x: -36 * dir }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
            {items[i].node}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="sc-hint">step {i} of {items.length - 1} · ← → while focused, or swipe</div>
    </div>
  );
}
