import Link from "next/link";
import ChapterPage, { Section } from "../components/chrome/ChapterPage";
import { FactorGrid, PipelineDiagram } from "../components/diagrams/SummaryDiagrams";
import Figure from "../components/figure/Figure";

export const metadata = { title: "How the experiments ran" };

type Card = { id: string; title: string; question: string; grid: React.ReactNode; varies: string; fixed: string; measures: string;
              runs: string; result: string; href: string; chapter: string };

const CARDS: Card[] = [
  { id: "E5", title: "Regime map", question: "Which structure forms for each mix of commitment and self-reinforcement?",
    grid: <FactorGrid cols={14} rows={4} layers={5} colLabel="commitment T (14)" rowLabel="κ (4)" layerLabel="5 source paces" />,
    varies: "commitment T, self-reinforcement κ, how often the source moves", fixed: "30 agents, no false alarms",
    measures: "tracking, commitment, regime", runs: "840 runs × 3000 rounds", result: "Three regimes, with boundaries that match exact formulas at every κ.",
    href: "/appendix/e5/", chapter: "/regimes/" },
  { id: "E8", title: "Cost and benefit against size and noise", question: "What does coordination buy and cost as groups grow and signals degrade?",
    grid: <FactorGrid cols={7} rows={4} layers={4} colLabel="commitment T (7)" rowLabel="noise ν (4)" layerLabel="4 group sizes" />,
    varies: "group size N (10–80), false alarms ν (0–0.75), commitment T", fixed: "κ = 0.2, source moves every 300 rounds",
    measures: "benefit, structural cost, tracking, shape over time", runs: "224 runs × 3000 rounds",
    result: "Cost about 2× at every size; benefit grows like ln N; noise narrows the usable range of T.", href: "/appendix/e8/", chapter: "/size-and-noise/" },
  { id: "E9", title: "Position against evidence", question: "Does it matter what an agent rewards a link for?",
    grid: <FactorGrid cols={7} rows={4} layers={3} colLabel="commitment T (7)" rowLabel="noise ν (4)" layerLabel="3 rules × 4 sizes" />,
    varies: "reward rule: closeness, direct evidence, noise-tuned evidence; plus an ideal statistician", fixed: "the E8 grid, seeds and environments",
    measures: "benefit, tracking, structural and information cost", runs: "672 runs + 32 ideal filters",
    result: "Rewarding position beats rewarding evidence under noise; near-ideal up to ν = 0.5.", href: "/appendix/e9/", chapter: "/learning/" },
  { id: "A4", title: "Why the hub survives noise", question: "Which effect keeps tracking high near the lock-in edge?",
    grid: <FactorGrid cols={2} rows={2} colLabel="rivals: free · made equal" rowLabel="reward" split={["position · free", "position · equal", "evidence · free", "evidence · equal"]} />,
    varies: "reward rule × whether rivals' weights are equalized every round", fixed: "constant source; 4 sizes × 3 noise levels × 4 values of T",
    measures: "tracking, against four reduced models", runs: "384 runs × 4000 rounds",
    result: "Uneven rivals explain the excess tracking; relays amplify it.", href: "/appendix/analysis/", chapter: "/robustness/" },
  { id: "E6", title: "Attention against transport", question: "Do loops survive because of the budget or because of the reward?",
    grid: <FactorGrid cols={2} rows={2} colLabel="reward: closeness · flow" rowLabel="budget: agent / pool" split={["agent · closeness", "agent · flow", "pool · closeness", "pool · flow"]} />,
    varies: "budget × reward, concentration p, source schedule", fixed: "7 × 7 grid network", measures: "loops, shape, structural cost",
    runs: "720 runs × 3000 rounds", result: "Trees need self-reinforcement; the budget decides robustness and cost.", href: "/appendix/e6/", chapter: "/structure/" },
  { id: "E1", title: "Memory against pace", question: "How long should a network remember when the source moves and signals are noisy?",
    grid: <FactorGrid cols={15} rows={6} colLabel="memory (15)" rowLabel="pace τ_E (6)" />,
    varies: "memory (via ε or κ) × pace of change", fixed: "30 agents, ν = 0.5, T = 0.3", measures: "log-loss on the true source",
    runs: "360 runs per knob", result: "Best memory grows like pace^0.43; self-reinforcement is not a memory.", href: "/appendix/e1/", chapter: "/memory/" },
  { id: "E4", title: "Memory sets the pace", question: "If a population's memory changes its environment's pace, where does memory settle?",
    grid: <FactorGrid cols={12} rows={3} layers={2} colLabel="resident memory (12)" rowLabel="agent type (3)" layerLabel="2 baseline paces" />,
    varies: "resident memory × invader memory × agent type", fixed: "binary environment, invaders at 1%", measures: "divergence, effective pace, best response",
    runs: "2 seeds × 10⁷ steps per pair", result: "A stable memory in every case, shorter than the group optimum.", href: "/appendix/e4/", chapter: "/memory/#feedback" },
  { id: "E3", title: "Paid attention", question: "If being listened to pays, do hubs entrench?",
    grid: <FactorGrid cols={4} rows={2} colLabel="payment a (4)" rowLabel="τ_E (2)" />,
    varies: "payment for relayed attention × pace", fixed: "30 agents, T = 0.6; κ evolves by copying the best earner",
    measures: "hub tenure, takeovers, evolved κ", runs: "150 epochs × 4 seeds per cell", result: "No entrenchment: hubs change every one or two epochs.",
    href: "/appendix/e3/", chapter: "/memory/#payment" },
];

export default function Page() {
  return (
    <ChapterPage slug="experiments">
      <Section n="10.1" id="pipeline" title="One pipeline">
        <p className="lead">
          Every study follows the same four steps. What changes is the grid (what is varied) and the comparison (what the
          result is tested against).
        </p>
        <Figure id="pipeline" wide title="How each study runs" caption="Runs are independent and batched on a GPU; measures are recorded every 300 rounds and averaged over the second half of each run.">
          <PipelineDiagram />
        </Figure>
        <p>
          The simulations, analysis and checks are open: a Python package with tests for every closed form and
          reduction, and the scripts that produced each data file. The appendix gives each study in full.
        </p>
      </Section>
      <Section n="10.2" id="studies" title="The studies">
        <div className="cards">
          {CARDS.map((c) => (
            <article key={c.id} className="card">
              <span className="tag">{c.id}</span>
              <h3>{c.title}</h3>
              <p style={{ margin: "2px 0 6px" }}>{c.question}</p>
              {c.grid}
              <dl>
                <dt>varies</dt><dd>{c.varies}</dd>
                <dt>fixed</dt><dd>{c.fixed}</dd>
                <dt>measures</dt><dd>{c.measures}</dd>
                <dt>size</dt><dd>{c.runs}</dd>
              </dl>
              <p className="result">{c.result} <Link href={c.chapter}>Chapter</Link> · <Link href={c.href}>Full detail</Link></p>
            </article>
          ))}
        </div>
      </Section>
      <Section n="10.3" id="checks" title="Checks against the original work">
        <p>
          Before any new experiment, the model was rebuilt and checked against what the original papers report: the thesis
          model in a faithful mode that reproduces its code&apos;s behaviour, the niche-learning model against its authors&apos;
          code, and the transport networks against their known optima. The <Link href="/appendix/validation/">validation</Link>{" "}
          and <Link href="/appendix/errata/">errata</Link> appendices list what was reproduced, what was not, and what was
          corrected.
        </p>
      </Section>
    </ChapterPage>
  );
}
