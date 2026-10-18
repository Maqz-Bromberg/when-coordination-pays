"use client";

import Link from "next/link";
import { GLOSSARY, GROUPS } from "../../lib/glossary";
import HoverCard from "./HoverCard";

/** A term in running text: dotted underline in its source colour, hover or tap for the definition. */
export default function T({ k, children }: { k: string; children?: React.ReactNode }) {
  const e = GLOSSARY[k];
  if (!e) throw new Error(`glossary: unknown term ${k}`);
  const g = GROUPS.find((x) => x.id === e.group)!;
  return (
    <HoverCard className="term" color={g.color} trigger={children ?? e.term}
      card={<>
        <div className="hc-kicker">{g.label} · {g.source}</div>
        <div className="hc-title">{e.term}</div>
        <p>{e.def}</p>
        <Link href={`/glossary/#${k}`} className="hc-link">Glossary →</Link>
      </>} />
  );
}
