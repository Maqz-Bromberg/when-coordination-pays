import Link from "next/link";
import ChapterPage, { Section } from "../components/chrome/ChapterPage";
import Cite from "../components/ui/Cite";

export const metadata = { title: "The original work" };

export default function Page() {
  return (
    <ChapterPage slug="origins">
      <Section n="11.1" id="lines" title="Three lines of work">
        <p className="lead">
          The model joins three lines of research. Each started from a premise; this chapter says what each premise was and
          how it fared here.
        </p>
        <h3>Source-to-structure networks</h3>
        <p>
          A 2020 thesis asked how hierarchy arises from local adaptation <Cite id="bromberg2020hierarchy" />. Agents
          strengthen links to whoever is closest to the information, measured by a random-walk effective distance{" "}
          <Cite id="brockmann2013hidden" />, and the network&apos;s shape is read with hierarchy coordinates{" "}
          <Cite id="corominas2013originsheirarchy" />. Its premise: where information appears shapes who listens to whom,
          and the result is hierarchy.
        </p>
        <h3>Optimal learning in changing niches</h3>
        <p>
          Lee, Flack and Krakauer studied how much memory a learner should keep when its environment switches and its
          observations are noisy, and what happens when learners change the environment they track{" "}
          <Cite id="lee2024constructing" />. Their premises: the best memory grows like the square root of the time between
          switches, and agents that stabilize their environment create a shared good, which can favour monopolies.
        </p>
        <h3>Adaptive transport networks</h3>
        <p>
          Networks that grow the links carrying flow under a material budget form trees for steady loads and keep loops
          for fluctuating ones <Cite id="corson2010fluctuations" /> <Cite id="katifori2010damage" />{" "}
          <Cite id="ronellenfitsch2016global" />. Their premise: fluctuations, not the budget alone, maintain redundancy.
        </p>
      </Section>

      <Section n="11.2" id="premises" title="How each premise fared">
        <div className="tablewrap"><table>
          <thead><tr><th>premise</th><th>what was found</th><th>where</th></tr></thead>
          <tbody>
            <tr><td>Where information appears shapes who listens to whom, producing hierarchy.</td>
              <td>Holds within a window of commitment (κ &lt; T &lt; T½): below it the group locks onto early leaders,
                above it attention stays spread.</td>
              <td><Link href="/regimes/">3</Link></td></tr>
            <tr><td>The best memory grows like (pace)<sup>1/2</sup>.</td>
              <td>Reproduced in the attention network once signals are noisy (exponent 0.43). Self-reinforcement does not act
                as memory.</td><td><Link href="/memory/">7.1</Link></td></tr>
            <tr><td>Stabilizers create a shared good; monopolies may follow.</td>
              <td>Memory and pace settle at a stable point with free-riding. Paying for attention does not entrench hubs in
                the attention network.</td><td><Link href="/memory/#feedback">7.2</Link>, <Link href="/memory/#payment">7.4</Link></td></tr>
            <tr><td>Learners infer the environment individually.</td>
              <td>They correspond to the &ldquo;reward evidence&rdquo; rule. The network&apos;s relays add robustness to noise;
                memory limits both.</td><td><Link href="/learning/">6</Link></td></tr>
            <tr><td>Fluctuating loads keep loops in transport networks.</td>
              <td>True for a flow-based reward; with the attention reward the network locks into some tree. The budget decides
                robustness and cost.</td><td><Link href="/structure/">8</Link></td></tr>
            <tr><td>Three regimes: distributed, hierarchy, over-betting.</td>
              <td>Confirmed, with exact boundaries T = κ and T½.</td><td><Link href="/regimes/">3</Link></td></tr>
          </tbody>
        </table></div>
      </Section>

      <Section n="11.3" id="related" title="Related ideas">
        <p>
          The dynamics belong to a family of learning rules studied in game theory and statistical physics: replicator
          dynamics with memory loss <Cite id="sato2003coupled" />, experience-weighted attraction{" "}
          <Cite id="camerer1999experience" />, and network formation by reinforcement <Cite id="skyrms2000dynamic" />{" "}
          <Cite id="bala2000noncooperative" />. Adaptive networks that change with the states on them are reviewed in{" "}
          <Cite id="gross2008adaptive" />. The full list is on the <Link href="/references/">references</Link> page.
        </p>
      </Section>
    </ChapterPage>
  );
}
