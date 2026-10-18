"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Mode = "system" | "light" | "dark";
const NEXT: Record<Mode, Mode> = { system: "light", light: "dark", dark: "system" };

/** Cycles system → light → dark. "system" removes data-theme so prefers-color-scheme decides. */
export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  useEffect(() => {
    try { const m = localStorage.getItem("theme") as Mode | null; if (m) setMode(m); } catch { /* storage blocked */ }
  }, []);
  const apply = (m: Mode) => {
    setMode(m);
    if (m === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", m);
    try { localStorage.setItem("theme", m); } catch { /* storage blocked */ }
  };
  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;
  return (
    <button type="button" className="icon-btn" onClick={() => apply(NEXT[mode])} aria-label={`Theme: ${mode}. Switch to ${NEXT[mode]}`} title={`Theme: ${mode}`}>
      <Icon size={16} />
    </button>
  );
}

/** Runs before paint, so a stored choice never flashes the other theme. */
export const themeScript = `try{var m=localStorage.getItem("theme");if(m==="light"||m==="dark")document.documentElement.setAttribute("data-theme",m)}catch(e){}`;
