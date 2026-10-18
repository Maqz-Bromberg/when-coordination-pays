"use client";
/** Which figure is enlarged. A module-level store (as in remystifying-science's openEnlarged) so any figure can open
 *  the one lightbox mounted in the layout, and the chapter keyboard navigation can tell that one is open. */
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";

export type Enlarged =
  | { kind: "markup"; markup: string; download: string; w: number; h: number; title: string }
  | { kind: "node"; node: ReactNode; title: string };

let current: Enlarged | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

export function openEnlarged(e: Enlarged) { current = e; notify(); }
export function closeEnlarged() { current = null; notify(); }
export function isEnlargedOpen() { return current !== null; }
export function useEnlarged() {
  return useSyncExternalStore((f) => { listeners.add(f); return () => listeners.delete(f); }, () => current, () => null);
}
