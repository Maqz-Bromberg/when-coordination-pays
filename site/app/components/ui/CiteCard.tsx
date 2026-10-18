"use client";

import { withBase } from "../../lib/base";
import type { BibEntry } from "../../lib/bib";
import HoverCard from "./HoverCard";

export default function CiteCard({ entry, label }: { entry: BibEntry; label: string }) {
  return (
    <HoverCard className="cite" trigger={label}
      card={<>
        <div className="hc-kicker">{entry.type === "mastersthesis" ? "thesis" : entry.type}</div>
        <div className="hc-title">{entry.title}</div>
        <p>{entry.author}. <i>{entry.venue}</i>, {entry.year}.</p>
        <div className="hc-links">
          {entry.pdf && <a className="hc-link" href={withBase(entry.pdf)} target="_blank" rel="noreferrer">PDF ↗</a>}
          {entry.arxiv && <a className="hc-link" href={`https://arxiv.org/abs/${entry.arxiv}`} target="_blank" rel="noreferrer">arXiv:{entry.arxiv} ↗</a>}
          {entry.doi && <a className="hc-link" href={`https://doi.org/${entry.doi}`} target="_blank" rel="noreferrer">doi:{entry.doi} ↗</a>}
        </div>
      </>} />
  );
}
