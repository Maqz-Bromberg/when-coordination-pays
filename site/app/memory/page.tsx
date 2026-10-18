import Link from "next/link";
import ChapterPage, { Details, Section, Takeaway } from "../components/chrome/ChapterPage";
import PlotFigure from "../components/diagrams/PlotFigure";
import Figure from "../components/figure/Figure";
import Cite from "../components/ui/Cite";
import T from "../components/ui/T";
import { E1, E4, e1rows, e3table, e4br, e7curves, f2 } from "../lib/data";

export const metadata = { title: "Memory, pace and payment" };

export default function Page() {
  return (
    <ChapterPage slug="memory">
      <Section n="7.1" id="pace" title="Memory should grow with the pace of change">
        <p className="lead">
          A learner in a changing world faces a trade-off. A short memory follows changes quickly but is thrown about by
          noise; a long memory averages the noise out but lags behind changes. For a single learner the best memory grows
          like the square root of the time between changes <Cite id="lee2024constructing" />.
        </p>
        <p>
          The attention network has two candidate memories: the blending weight <T k="eps">ε</T>, with memory
          τ<sub>m</sub> = 1/ln(1 + ε), and self-reinforcement <T k="kappa">κ</T>, which also makes the past persist. With
          a perfect signal the shortest memory always wins, so the test adds 50% false alarms and scores runs by log-loss
          on the true source (30 agents, 15 memories, six paces, four repeats; <Link href="/appendix/e1/">E1</Link>).
        </p>
        <Figure id="e1" title="Best memory against the pace of change" caption={`Best memory τ_m* against the mean time between source moves τ_E, both axes logarithmic. With ε as the memory, τ_m* grows like τ_E^${E1.slopeEps.toFixed(2)}, approaching the predicted 1/2 from below. With κ it barely moves (slope ${E1.slopeKappa.toFixed(2)}).`}>
          <PlotFigure spec={{ kind: "loglog", data: e1rows(), x: "tau_E", y: "tau_m_star", series: "knob", xLabel: "τ_E (rounds between moves)", yLabel: "best memory τ_m*" }} />
        </Figure>
        <Takeaway>Noise is what makes memory valuable. ε behaves as memory, with the predicted scaling; κ does not. Self-reinforcement is a commitment knob, which is why it sets the lock-in edge.</Takeaway>
      </Section>

      <Section n="7.2" id="feedback" title="When memory sets the pace">
        <p>
          In niche-learning models agents can also change their environment. <T k="stabilizer">Stabilizers</T> slow the
          switching they track, destabilizers speed it up. If a population&apos;s memory sets how fast its own world
          changes, does the best memory settle, cycle or drift? Each memory was tried as a resident population, and a
          rare invader with every other memory was tested against it (<Link href="/appendix/e4/">E4</Link>).
        </p>
        <Figure id="e4" title="Best response against the residents' memory (τ_E = 1000)" caption="Where a curve crosses the dashed identity, the population's memory is self-consistent. Every crossing is stable.">
          <PlotFigure spec={{ kind: "loglog", data: e4br(1000), x: "tm", y: "br", series: "type", xLabel: "residents' memory τ_m", yLabel: "best-response memory" }} />
        </Figure>
        <ul>
          <li><b>A stable balance in every case.</b> Iterating the best response converges from both ends, with no cycles
            and no drift.</li>
          <li><b>Stabilizers slow their world 15–18-fold</b> and settle at memories several times longer than passive
            agents; destabilizers halve the time between changes and settle shorter.</li>
          <li><b>A free-rider problem.</b> The stable memory is shorter than the one that is best for the group (10.7
            against about 14 for stabilizers at τ_E = 1000): shorter-memory invaders profit from the calm that residents
            provide.</li>
        </ul>
        <Details title="The numbers: self-consistent memories">
          <div className="tablewrap"><table>
            <thead><tr><th>type</th><th>τ_E</th><th>stable memory</th><th>best-response slope</th><th>effective pace there</th><th>best for the group</th></tr></thead>
            <tbody>{E4.cases.map((c) => (
              <tr key={`${c.type}-${c.tau_E}`}><td>{c.type}</td><td>{c.tau_E}</td><td>{f2(c.fixed_point)}</td><td>{f2(c.BR_slope)}</td>
                <td>{Math.round(c.tau_eff_at_fixed)}</td><td>{f2(c.self_optimum)}</td></tr>
            ))}</tbody>
          </table></div>
        </Details>
      </Section>

      <Section n="7.3" id="window" title="Pooling several signals before updating">
        <p>
          The thesis could also pool several rounds of news before each update. Summing distances, as its code does, never
          helps. Averaging rewards does: it acts as a sampling window whose best length grows like τ_E<sup>0.42</sup>,
          close to the memory scaling above (<Link href="/appendix/e7/">E7</Link>).
        </p>
        <Figure id="e7" title="Log-loss against the pooling window (τ_E = 300)" caption="Summing distances (the thesis rule) only gets worse with a longer window; averaging rewards has an optimum.">
          <PlotFigure spec={{ kind: "lines", logX: true, data: e7curves(300), x: "k", y: "loss", series: "rule", xLabel: "window k (signals per update)", yLabel: "log-loss on the true source" }} />
        </Figure>
      </Section>

      <Section n="7.4" id="payment" title="Paying for attention does not entrench hubs">
        <p>
          If being listened to pays, do hubs use it to stay hubs? Here agents earn in proportion to the attention they
          relay, and each epoch the worst earner copies the best earner&apos;s self-reinforcement (<Link href="/appendix/e3/">E3</Link>).
          Hubs do not entrench. They keep changing every one or two epochs, with or without payment; with a slow source,
          payment, if anything, shortens their tenure.
        </p>
        <div className="tablewrap"><table>
          <thead><tr><th>τ_E</th><th>payment a</th><th>mean hub tenure (epochs)</th><th>takeovers in 150 epochs</th></tr></thead>
          <tbody>{e3table().map((r) => (
            <tr key={`${r.tau}-${r.a}`}><td>{r.tau}</td><td>{r.a}</td><td>{f2(r.tenure)}</td><td>{r.takeovers.toFixed(0)}</td></tr>
          ))}</tbody>
        </table></div>
        <p>
          The reason is that in this model nobody can change the source&apos;s pace: a hub cannot make itself more
          reliable by holding attention, unlike a stabilizer in a niche. The same holds when the next source is drawn in
          proportion to relayed attention, and on sparse networks.
        </p>
      </Section>
    </ChapterPage>
  );
}
