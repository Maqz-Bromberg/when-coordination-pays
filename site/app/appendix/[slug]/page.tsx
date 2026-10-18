import { section, render, whole } from "../../lib/docs";
import { APPENDIX } from "../../lib/chapters";

/** Full detail for each study, rendered from the research write-up in docs/ at build time. */
const SOURCES: Record<string, () => string> = {
  e1: () => section("results.md", "E1:"),
  bridges: () => section("results.md", "Bridges"),
  e2: () => section("results.md", "E2:"),
  e3: () => section("results.md", "E3:"),
  e4: () => section("results.md", "E4:"),
  e5: () => section("results.md", "E5:"),
  e6: () => section("results.md", "E6:"),
  e7: () => section("results.md", "E7:"),
  e8: () => ["Paths in the hierarchy morphospace", "E8: cost of coordination", "Variation below T½", "What the measures stand for"]
    .map((h) => `## ${h}\n${section("results.md", h, -1)}`).join("\n\n"),
  e9: () => section("results.md", "E9:", -1),
  analysis: () => section("results.md", "A1–A4", -1),
  validation: () => whole("validation.md"),
  errata: () => whole("errata.md"),
};

export function generateStaticParams() {
  return Object.keys(SOURCES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: APPENDIX.find((a) => a.slug === `appendix/${slug}`)?.title ?? "Appendix" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = APPENDIX.find((a) => a.slug === `appendix/${slug}`)?.title ?? slug;
  return (
    <main className="chapter">
      <header className="chapter-head" style={{ gridTemplateColumns: "1fr" }}>
        <div>
          <div className="eyebrow">Appendix</div>
          <h1>{title}</h1>
          <p className="dek">The full record of this study as written during the research: setup, numbers and caveats. Paths
            such as <code>nichenet/…</code> refer to the Python package in the repository.</p>
        </div>
      </header>
      <div className="doc" dangerouslySetInnerHTML={{ __html: render(SOURCES[slug]()) }} />
    </main>
  );
}
