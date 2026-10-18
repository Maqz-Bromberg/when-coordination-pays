import { cite } from "../../lib/bib";
import CiteCard from "./CiteCard";

/** Citation in running text, e.g. <Cite id="lee2024constructing" />: "(Lee et al. 2024)" with a hover card. */
export default function Cite({ id, bare = false }: { id: string; bare?: boolean }) {
  const e = cite(id);
  return <CiteCard entry={e} label={bare ? e.short : `(${e.short})`} />;
}
