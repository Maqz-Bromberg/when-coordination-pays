/** The reading order. Chapters are routes; ←/→ and the pager move along this list. */
export type Chapter = { slug: string; num: number; title: string; short: string; dek: string };

export const CHAPTERS: Chapter[] = [
  { slug: "", num: 0, title: "When coordination pays", short: "Overview",
    dek: "A group learns whom to listen to while the source of news moves and the signal lies." },
  { slug: "model", num: 1, title: "The model", short: "The model",
    dek: "Agents with one unit of attention, a moving source, false alarms, and four steps per round." },
  { slug: "measures", num: 2, title: "Measuring coordination", short: "Measures",
    dek: "Tracking, benefit, two kinds of cost, and the shape of the network." },
  { slug: "regimes", num: 3, title: "Three regimes", short: "Regimes",
    dek: "Lock-in, coordinated hierarchy, spread out, with boundaries that follow from exact formulas." },
  { slug: "size-and-noise", num: 4, title: "Size and noise", short: "Size and noise",
    dek: "What coordination buys and costs as the group grows and the signal degrades." },
  { slug: "robustness", num: 5, title: "Why the hub survives noise", short: "Robustness",
    dek: "Uneven rivals and relays, found by switching effects off one at a time." },
  { slug: "learning", num: 6, title: "Learning through others", short: "Learning rules",
    dek: "Rewarding position against rewarding evidence, and the ideal statistician." },
  { slug: "memory", num: 7, title: "Memory, pace and payment", short: "Memory and pace",
    dek: "How long to remember, what happens when memory sets the pace, and paying for attention." },
  { slug: "structure", num: 8, title: "Budgets and shapes", short: "Budgets and shapes",
    dek: "Attention against transport networks, and where each experiment moves the network's shape." },
  { slug: "implications", num: 9, title: "Implications and limits", short: "Implications",
    dek: "What follows if the model's assumptions hold, and where they stop." },
  { slug: "experiments", num: 10, title: "How the experiments ran", short: "Experiments",
    dek: "One pipeline, many grids: what each study varied, fixed, measured and found." },
  { slug: "origins", num: 11, title: "The original work", short: "Original work",
    dek: "Three lines of research this joins, their premises, and how each premise fared." },
];

export const APPENDIX: { slug: string; title: string }[] = [
  { slug: "appendix/analysis", title: "Analysis A1–A4" },
  { slug: "appendix/e1", title: "E1 Memory against pace" },
  { slug: "appendix/bridges", title: "B1–B5 Bridges" },
  { slug: "appendix/e2", title: "E2 Size scaling" },
  { slug: "appendix/e3", title: "E3 Paid attention" },
  { slug: "appendix/e4", title: "E4 Memory sets pace" },
  { slug: "appendix/e5", title: "E5 Regime map" },
  { slug: "appendix/e6", title: "E6 Attention vs transport" },
  { slug: "appendix/e7", title: "E7 Update window" },
  { slug: "appendix/e8", title: "E8 Cost against size and noise" },
  { slug: "appendix/e9", title: "E9 Position against evidence" },
  { slug: "appendix/validation", title: "Validation" },
  { slug: "appendix/errata", title: "Errata" },
  { slug: "glossary", title: "Glossary" },
  { slug: "references", title: "References" },
];

export const href = (slug: string) => (slug ? `/${slug}/` : "/");
export const chapterIndex = (path: string) => {
  const clean = path.replace(/^\/+|\/+$/g, "");
  return CHAPTERS.findIndex((c) => c.slug === clean);
};
