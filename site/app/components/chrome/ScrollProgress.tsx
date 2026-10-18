"use client";
// Adapted from remystifying-science app/components/ui/scroll-progress-bar.tsx @ f578288 (MUI Box and the
// applet-maximize coupling removed). Driven by a motion value bound to scaleX, so scrolling animates it on the
// compositor: no React re-renders and no width-based layout work per scroll frame.
import { motion, useScroll } from "motion/react";
import { useEnlarged } from "../figure/lightbox-store";
import { useAnyMaximized } from "../figure/maximize";

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const enlarged = useEnlarged();
  const maximized = useAnyMaximized();
  if (enlarged || maximized) return null;
  return (
    <div className="progress" aria-hidden>
      <motion.div style={{ height: "100%", background: "var(--accent)", scaleX: scrollYProgress, transformOrigin: "0% 50%" }} />
    </div>
  );
}
