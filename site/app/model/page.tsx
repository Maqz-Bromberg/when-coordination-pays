import Link from "next/link";
import ChapterPage, { Details, Section, Takeaway } from "../components/chrome/ChapterPage";
import { EnvironmentDiagram, RoundDiagram } from "../components/diagrams/SummaryDiagrams";
import Figure from "../components/figure/Figure";
import Cite from "../components/ui/Cite";
import T from "../components/ui/T";

export const metadata = { title: "The model" };

export default function Page() {
  return (
    <ChapterPage slug="model">
      <Section n="1.1" id="agents" title="Agents with one unit of attention">
        <p className="lead">
          There are N agents. Each has one unit of attention to split among the others: how much it listens to each.
          Nothing else about an agent matters. The whole state of the group is one table, A, in which A<sub>ki</sub> is
          the share of agent i&apos;s attention that goes to agent k. Each column sums to one.
        </p>
        <p>
          Read as a network, the table has a link from k to i whose strength is how much i listens to k. Information
          flows along those links: news that reaches k travels to those who listen to k, and on from there. A group in
          which everyone listens mostly to one agent is a star with that agent as its <T k="hierarchy">hub</T>. A group
          in which everyone listens a little to everyone is a complete graph with thin links.
        </p>
      </Section>

      <Section n="1.2" id="round" title="One round in four steps">
        <p>
          Every round a piece of news appears at one agent, the source. Each agent then adjusts whom it listens to. All
          agents update at once, in the same four steps.
        </p>
        <Figure id="round" title="One round of the model" caption="The same four steps repeat every round, for every agent at once. Bars are one agent's view of the five agents it can listen to; s is the one closest to the news.">
          <RoundDiagram />
        </Figure>
        <ol>
          <li><b>News appears</b> at the current source, or with probability <T k="nu">ν</T> at a random agent: a false
            alarm. Agents cannot tell which.</li>
          <li><b>Score the links.</b> Each agent scores everyone it could listen to by how close they sit to the news and
            by how strong the link already is. Closeness counts paths through the network: listening to someone who
            listens to the source is almost as good as listening to the source. Hearing it first-hand is still better,
            by a factor <T k="rho">ρ = 2.6</T>. Strength enters as A<sup>κ</sup>, so with <T k="kappa">κ</T> &gt; 0 strong links
            score more: success breeds success.</li>
          <li><b>Commit.</b> Scores become rewards in proportion to score<sup>1/T</sup>. With a low{" "}
            <T k="T">temperature T</T> almost all reward goes to the best link; with a high T it is spread.</li>
          <li><b>Blend with memory.</b> The new attention is a weighted average of the old attention and the reward,
            (old + ε·reward)/(1 + ε). The <T k="eps">memory parameter ε</T> sets how fast old attention is replaced.</li>
        </ol>
        <Details title="In detail: closeness as a random-walk effective distance">
          <p>
            Closeness is the <T k="rwed">random-walk effective distance</T> of <Cite id="brockmann2013hidden" />, as used
            by the 2020 thesis <Cite id="bromberg2020hierarchy" />. Row-normalize the attention table so that P<sub>sk</sub>{" "}
            is the share of s&apos;s audience made up by k: the probability that a walker carrying news from s steps to k.
            With a cost δ per step,
          </p>
          <span className="eq">Z = (I − e<sup>−δ</sup>P)<sup>−1</sup>,   D<sub>sk</sub> = −ln( Z<sub>sk</sub> / Z<sub>kk</sub> ).</span>
          <p>
            D is short when many likely walks lead from s to k. At large δ (the thesis uses δ = 10) only the direct
            step counts, and D<sub>sk</sub> ≈ δ − ln P<sub>sk</sub>: a surprisal along the network. The source&apos;s own
            distance is set to the smallest relay distance divided by ρ = 2.6, which is what makes first-hand news worth
            more than any relay.
          </p>
        </Details>
        <Details title="In detail: the update as equations">
          <span className="eq">S<sub>ki</sub> = D<sub>k</sub><sup>κ−1</sup> · A<sub>ki</sub><sup>κ</sup>       (info score of the link k → i)</span>
          <span className="eq">r<sub>ki</sub> = S<sub>ki</sub><sup>1/T</sup> / Σ<sub>j</sub> S<sub>ji</sub><sup>1/T</sup>       (tempered selection)</span>
          <span className="eq">A<sub>ki</sub> ← (A<sub>ki</sub> + ε r<sub>ki</sub>) / (1 + ε)       (blend; each column stays a distribution)</span>
          <p>
            The thesis selected with a cut instead of a temperature: only the top fraction (1 − φ) of each agent&apos;s
            links was rewarded. Tempered selection contains the cut as T → 0 and makes the dynamics smooth enough to solve.
            Its fixed points are softmaxes of −ln D at an effective temperature (T − κ)/(1 − κ), the same family as
            the learning dynamics of <Cite id="sato2003coupled" />. One update step is exactly a forward-Euler step of
            that flow.
          </p>
        </Details>
      </Section>

      <Section n="1.3" id="world" title="A moving source seen through noise">
        <p>
          The world does not stand still. The true source stays put for <T k="tauE">τ_E</T> rounds on average and then
          jumps to another agent. Agents never see the true source; they only see where each piece of news lands. With
          probability ν that is a random agent instead.
        </p>
        <Figure id="environment" title="The environment" caption="Top: the true source, which stays put for τ_E rounds on average and then moves. Bottom: where the news lands. Outlined cells are false alarms; here about 30% of rounds, i.e. ν ≈ 0.3. Colours are agents.">
          <EnvironmentDiagram />
        </Figure>
        <p>
          This is the setting of learning in a changing niche <Cite id="lee2024constructing" />: an environment that
          switches state at some pace, observed through noise. Too short a memory chases every false alarm; too long a
          memory clings to a source that has moved.
        </p>
      </Section>

      <Section n="1.4" id="dials" title="The dials">
        <div className="tablewrap">
          <table>
            <thead><tr><th>dial</th><th>what it does</th><th>values used</th></tr></thead>
            <tbody>
              <tr><td><T k="T">T</T> commitment</td><td>how hard each agent bets on its best-scoring link (low T = hard)</td><td>0.05 – 2</td></tr>
              <tr><td><T k="kappa">κ</T> self-reinforcement</td><td>how much a strong link earns for being strong</td><td>0 – 0.6; 0.2 in the cost studies</td></tr>
              <tr><td><T k="eps">ε</T> memory</td><td>how fast old attention is replaced (τ<sub>m</sub> = 1/ln(1 + ε))</td><td>1 (about 1.4 rounds) unless varied</td></tr>
              <tr><td><T k="rho">ρ</T> first-hand advantage</td><td>how much better first-hand news is than the best relay</td><td>2.6 (thesis)</td></tr>
              <tr><td><T k="nu">ν</T> false alarms</td><td>share of rounds in which the news lands on a random agent</td><td>0 – 0.75</td></tr>
              <tr><td><T k="tauE">τ_E</T> pace</td><td>mean rounds between moves of the true source</td><td>10 – 3000; 300 in the cost studies</td></tr>
              <tr><td><T k="N">N</T> group size</td><td>number of agents</td><td>10 – 80</td></tr>
            </tbody>
          </table>
        </div>
        <Takeaway>Two dials do most of the work: self-reinforcement κ and commitment T. Their ratio decides which of three regimes a group falls into.</Takeaway>
      </Section>
    </ChapterPage>
  );
}
