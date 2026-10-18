import Link from "next/link";
import ChapterPage, { Details, Section, Takeaway } from "../components/chrome/ChapterPage";
import HierarchyPaperFigures from "../components/diagrams/HierarchyPaperFigures";
import HierarchyPrimer from "../components/diagrams/HierarchyPrimer";
import MorphPaths3D, { type PathGroup } from "../components/diagrams/MorphPaths3D";
import NetworkPicture from "../components/diagrams/NetworkPicture";
import PlotFigure from "../components/diagrams/PlotFigure";
import UpdateFlowchart from "../components/diagrams/UpdateFlowchart";
import Figure from "../components/figure/Figure";
import Cite from "../components/ui/Cite";
import T from "../components/ui/T";
import { E6, E6_COLORS, e6loops, PATH_GROUPS } from "../lib/data";

export const metadata = { title: "Budgets and shapes" };

type Cell = { budget: string; usage: string; kappa: number; p: number; reward: number[][]; weights: number[][]; loops: number };
const TICKS = [0.4, 0.5, 0.67, 1, 1.5, 2, 3, 5, 10, 20];

function cellTitle(c: Cell) {
  return `${c.budget === "node" ? "Per-agent" : "Shared"} budget · ${c.usage === "rwed" ? `closeness, κ = ${c.kappa}` : "flow"}`;
}
function cellNote(c: Cell) {
  if (c.usage === "rwed" && c.kappa === 0) return "Equally close parents earn equally and nothing breaks the tie: every loop survives.";
  if (c.usage === "rwed") return "κ makes strong links earn more; past p ≈ 1/κ each agent commits to one parent: a tree.";
  if (c.budget === "node") return "Flow concentrates on the paths already in use; every agent keeps one incoming link.";
  return "Corson's optimum: a tree whose links thin out towards the leaves.";
}

export default function Page() {
  const cells = E6.pics.cells as Cell[];
  return (
    <ChapterPage slug="structure">
      <Section n="8.1" id="transport" title="Attention against transport">
        <p className="lead">
          Adaptive transport networks, such as leaf veins, blood vessels or slime moulds, also strengthen links that are
          used <Cite id="tero2010rules" />. Under a steady load they form trees; a fluctuating load keeps loops
          <Cite id="katifori2010damage" /> <Cite id="corson2010fluctuations" />. Is the attention model just such a
          network? Both can be written as one update in which only two ingredients differ.
        </p>
        <Figure id="e6-flow" wide title="One update, four variants" caption="The four variants are the four ways of choosing the reward (box 2) and the budget (box 4). Closeness with a per-agent budget is the attention model; flow with a shared budget is a transport network whose steady-load optimum is Corson's.">
          <UpdateFlowchart />
        </Figure>
        <ul>
          <li><b><T k="budget">Budget</T>:</b> each agent&apos;s attention sums to one, or one shared pool of material.</li>
          <li><b>Reward:</b> closeness to the news (the attention model), or the squared current the link carries when
            the source broadcasts (<T k="kirchhoff">flow</T>, transport).</li>
        </ul>
      </Section>

      <Section n="8.2" id="built" title="What each variant builds">
        <p>
          A 5 × 5 grid with the source in the bottom-left corner (ringed). Left in each card: the first reward. Right: the
          network after {E6.pics.steps} rounds. Line width follows the weight on a log scale over three decades.
        </p>
        <div className="cells">
          {cells.map((c) => {
            const color = c.usage === "rwed" ? "var(--ss)" : "var(--tr)";
            const t = cellTitle(c);
            return (
              <div key={t} className="cell-card" style={{ ["--c" as string]: color }}>
                <h3>{t}</h3>
                <div className="pics">
                  <div><NetworkPicture nodes={E6.pics.nodes} edges={E6.pics.edges} W={c.reward} source={E6.pics.source} label={`${t}, first reward`} color={color} />first reward (p = {c.p})</div>
                  <div><NetworkPicture nodes={E6.pics.nodes} edges={E6.pics.edges} W={c.weights} source={E6.pics.source} label={`${t}, built network`} color={color} />after {E6.pics.steps} rounds · {c.loops} loops</div>
                </div>
                <p>{cellNote(c)}</p>
              </div>
            );
          })}
        </div>
        <div className="fig-row">
          {(["constant", "random"] as const).map((s) => (
            <Figure key={s} id={`e6-loops-${s}`} title={`Loops against concentration, ${s} source`} caption={s === "constant"
              ? "Trees (0 loops) wherever the reward reinforces itself: for flow, and for closeness with κ > 0 past p ≈ 1/κ."
              : "Only flow keeps loops. Closeness with κ locks into some tree once p passes the threshold."}>
              <PlotFigure spec={{ kind: "lines", data: e6loops(s), x: "p", y: "loops", series: "cell", xLabel: "concentration p", yLabel: `loops (max ${(E6.lattice - 1) ** 2})`, logX: true, xTicks: TICKS, colors: E6_COLORS }} />
            </Figure>
          ))}
        </div>
        <ul>
          <li><b>Trees need self-reinforcement.</b> Flow reinforces itself: a stronger link carries more current. Closeness
            does so only through κ; at κ = 0 equally close parents tie forever and every loop survives.</li>
          <li><b>A fluctuating source keeps loops only with flow.</b> With closeness, a random source merely delays the
            transition; past it the network locks into some tree whatever the source does.</li>
          <li><b>The budget decides robustness and cost.</b> A per-agent budget forces every agent to keep a link: strong
            concentration gives trees, never a collapse, at most about 4.5× the cost of the uniform grid. A shared pool
            collapses onto a few links and its cost grows by orders of magnitude.</li>
        </ul>
      </Section>

      <Section n="8.3" id="paths" title="Where each experiment moves the shape">
        <p>
          Shape is read with the three hierarchy coordinates of Corominas-Murtra and colleagues
          <Cite id="corominas2013originsheirarchy" />. <T k="treeness">Treeness</T> asks whether paths fan out from a few
          tops or converge on a few bottoms; <T k="ff">feedforwardness</T> asks how much of the path weight avoids loops;{" "}
          <T k="order">orderability</T> asks how many agents sit outside any loop. Each network becomes one point in a
          cube, and an experiment that changes one setting traces a path through it.
        </p>
        <Figure id="hc-primer" wide title="Reading hierarchy coordinates"
          caption="Six small networks scored with the paper's definitions (this project's implementation) and where they sit in the cube. Arrows run from speaker to listener, the way news travels, so a hub on the source is a pyramid. Attention networks are weighted, so they are scored at 8 weight thresholds and averaged: a perfect hub reads 0.88, not 1 (chapter 2). As commitment is lost, runs slide down the diagonal (dashed), which is what the paths below show.">
          <HierarchyPrimer />
        </Figure>
        <Details wide title="How the original paper explains them, figure by figure">
          <Figure id="hc-paper" wide title="Hierarchy coordinates in the original paper"
            caption="The figures with which the measure was introduced, step by step: define the three axes, collapse loops, peel layers, count nodes outside loops, compute all three, then the cube and where real networks fall in it.">
            <HierarchyPaperFigures />
          </Figure>
        </Details>
        <p>
          Every line below follows one experimental variable with everything else fixed, through the{" "}
          <T k="morphospace">hierarchy morphospace</T>: seed-averaged treeness, feedforwardness and orderability, from a
          hollow start marker to a large end marker. One graph overlays up to seven experiments; side by side gives two their
          own panels with shared axes and camera.
        </p>
        <Figure id="paths" wide title="Paths in the hierarchy morphospace"
          caption="Marker size grows along each path with the experiment's varied setting: the small hollow marker is its lowest value (for example the lowest temperature T, or the first step in time) and the largest filled marker its highest. Drag to rotate, scroll to zoom; full screen keeps the layout, selection and camera.">
          <MorphPaths3D groups={PATH_GROUPS as PathGroup[]} initial={["e8-T-N80", "e5-markov100"]} />
        </Figure>
        <ul>
          <li><b>Commitment is a one-dimensional descent.</b> From the hierarchy corner every line runs down the diagonal
            to about (0.25, 0.25, 0.25) as T passes T½.</li>
          <li><b>Noise erodes feedforwardness first.</b> Treeness holds while loops appear among rivals (<Link href="/robustness/#trace">chapter 5</Link>).</li>
          <li><b>Hard selection builds shape regardless of the signal.</b> With a random source a selection cut still
            climbs toward the same region, so that structure comes from selection alone.</li>
        </ul>
      </Section>

      <Section n="8.4" id="function" title="Shape is not function">
        <p>
          Under a moving source, runs below the lock-in edge sit at the same coordinates as true hierarchies: a hub on a
          stale agent is as tree-like as a hub on the source. The same holds for cost (<Link href="/size-and-noise/#lockin-price">chapter 4</Link>).
          Position in the morphospace has to be read together with tracking.
        </p>
        <Takeaway>An organization with a clear hub looks the same whether the hub is current or stale. Only functional measures tell them apart.</Takeaway>
      </Section>
    </ChapterPage>
  );
}
