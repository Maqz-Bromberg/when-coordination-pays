"use client";
/** Chapters slide in from the side they come from: forward slides in from the right, back from the left. */
import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { chapterIndex } from "./lib/chapters";

let last = -1;

export default function Template({ children }: { children: React.ReactNode }) {
  const path = usePathname() || "/";
  const reduce = useReducedMotion();
  const dir = useRef(0);
  const i = chapterIndex(path);
  if (dir.current === 0) dir.current = i >= 0 && last >= 0 ? (i > last ? 1 : i < last ? -1 : 0) : 0;
  last = i;
  return (
    <motion.div initial={reduce ? false : { opacity: 0, x: 48 * dir.current }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
