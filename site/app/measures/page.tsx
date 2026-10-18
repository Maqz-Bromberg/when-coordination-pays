import Link from "next/link";
import ChapterPage, { Details, Section, Takeaway } from "../components/chrome/ChapterPage";
import CostBenefitDiagram from "../components/diagrams/CostBenefitDiagram";
import { ShapeDiagram } from "../components/diagrams/SummaryDiagrams";
import Figure from "../components/figure/Figure";
import Cite from "../components/ui/Cite";
import T from "../components/ui/T";

export const metadata = { title: "Measuring coordination" };

export default function Page() {
  return (
    <ChapterPage slug="measures">
      <Section n="2.1" id="tracking" title="Tracking: is the group listening to the right agent?">
        <p className="lead">
          The simplest question is functional. <T k="tracking">Tracking</T> is the average share of attention that the
          other agents put on the current true source, measured over the second half of a run. It is 1 when everyone
          listens only to the source, and 1/(N − 1) when attention is spread evenly.
        </p>
        <p>
          A related quantity is <T k="commitment">commitment</T>: how much of each agent&apos;s attention goes to its
          single favourite, whoever that is. High commitment with low tracking is the signature of a group betting
          confidently on the wrong agent.
        </p>
      </Section>

      <Section n="2.2" id="benefit" title="Benefit and information cost: attention as a bet">
        <p>
          Think of each agent&apos;s attention as a bet on where the next piece of news will appear. When it appears at
          s, the agent is charged −ln(its share on s): the log score, or <T k="logloss">log-loss</T>. A bettor who
          spreads attention evenly pays ln(N − 1) every time. The <T k="benefit">benefit</T> of coordinating is how many
          nats less than that the agent pays. It is at most ln(N − 1), for a bet entirely on the right agent, and it is
          strongly negative for a confident bet on the wrong one.
        </p>
        <Figure id="cost-benefit" wide title="Benefit and cost on a 7-agent example" caption="Top: one agent's attention over the six others (s = current source, o = the old source) and what each bet earns. Bottom: the same attention read as pipes (grey width = conductance) carrying a broadcast from s (coloured width = current). All numbers are computed for this example; the hub holds 0.85 of every other agent's attention.">
          <CostBenefitDiagram />
        </Figure>
        <p>
          The <T k="infocost">information cost</T> is how far a bet departs from indifference, KL(attention ‖ uniform),
          in the same nats. It is the same for the right bet and the wrong bet above (1.13 nats): it measures how much an
          agent committed, not whether it was right. That makes the difference useful. For a bettor whose confidence is
          calibrated, benefit and information cost agree on average, so their difference, the{" "}
          <T k="calibration">calibration gap</T>, is near zero. Confident and wrong drives it far below zero.
        </p>
        <Details title="Why not use distance as the benefit?">
          <p>
            The original thesis judged networks by how far, on average, news has to travel. That measure cannot see
            whether attention is concentrated on the source. The walk distance from s depends on how s&apos;s audience is
            split, not on how much each listener gives to s, so a network in which everyone listens only to the source
            and one in which everyone listens a little to everyone have the same mean distance from s. In the memory
            experiment (<Link href="/appendix/e1/">E1</Link>) it was 13.09 for every setting. Log-loss is the measure
            that sees concentration, and it is the quantity the niche-learning literature uses
            <Cite id="lee2024constructing" />.
          </p>
        </Details>
      </Section>

      <Section n="2.3" id="cost" title="Structural cost: attention as pipes">
        <p>
          A hub is not free. Read each pair&apos;s mutual attention as a pipe whose width is how much they listen to each
          other. When news appears at an agent it has to reach everyone: inject one unit there, take 1/(N − 1) out at
          every other agent, and let it flow. Kirchhoff&apos;s laws decide the flow, and the energy lost in transit,
          Σ I²/C, is the <T k="cost">structural cost</T> of that broadcast. Averaged over who speaks and divided by the
          same quantity for evenly spread attention, it is 1 for no structure and about 2 for a strong hub.
        </p>
        <p>
          The reason a hub costs more is visible in the diagram. News from the hub is cheap: the spokes carry it in
          parallel. News from anyone else must squeeze through that agent&apos;s one spoke into the hub, and a pipe
          carrying a lot of flow loses energy as the square of the flow. The measure stands for congestion at the hub,
          latency for news that starts elsewhere, and the lateral redundancy given up. It is borrowed from adaptive
          transport networks, where it is the quantity the network actually minimizes
          <Cite id="corson2010fluctuations" />. The attention model never pays it; here it is a way to price what the
          model builds.
        </p>
        <Takeaway>Benefit is in nats and asks whether attention is right. Structural cost is relative to no structure and asks what the shape of attention costs to use. They are measured separately because the model only optimizes the first.</Takeaway>
      </Section>

      <Section n="2.4" id="shape" title="Shape: hierarchy coordinates">
        <p>
          Shape is read with three numbers between 0 and 1 <Cite id="corominas2013originsheirarchy" />.{" "}
          <T k="treeness">Treeness</T> asks whether paths converge on a few top nodes, like a pyramid.{" "}
          <T k="ff">Feedforwardness</T> asks how much of the path weight avoids loops. <T k="order">Orderability</T> asks
          how many nodes sit outside any loop. Together they place a network in a cube, the{" "}
          <T k="morphospace">hierarchy morphospace</T>.
        </p>
        <Figure id="shapes" title="Three shapes and their coordinates" caption="Treeness (does everything flow to a top?), feedforwardness (does it avoid loops?) and orderability (are nodes outside loops?). Values are typical runs; weighted networks are scored over 8 weight thresholds, so a perfect hub reads 0.88, not 1.">
          <ShapeDiagram />
        </Figure>
        <p>
          The coordinates say whether a network looks like a pyramid. They do not say whether its top is the right agent.
          A hub on a stale source scores exactly like a hub on the current one (<Link href="/structure/#paths">chapter 8</Link>).
        </p>
        <Details title="In detail: weighted networks and a correction to the original measure">
          <p>
            The coordinates are defined for unweighted graphs. Attention networks are weighted, so each network is
            thresholded at 8 evenly spaced weight levels and the coordinates are averaged. A perfect star keeps its
            shape at 7 of the levels and vanishes at the lowest, so full hierarchy reads <T k="plateau">7/8 = 0.88</T>.
          </p>
          <p>
            The thesis computed treeness with element-wise instead of matrix powers in the path counts, and averaged over
            the wrong set of subgraphs. Both are corrected here (eq. 14 of <Cite id="corominas2013originsheirarchy" bare />);
            the appendix on <Link href="/appendix/errata/">errata</Link> shows how much they changed the thesis&apos;s results.
          </p>
        </Details>
      </Section>
    </ChapterPage>
  );
}
