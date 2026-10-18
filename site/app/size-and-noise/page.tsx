import Link from "next/link";
import ChapterPage, { Details, Section, Takeaway } from "../components/chrome/ChapterPage";
import PlotFigure from "../components/diagrams/PlotFigure";
import { ScalingDiagram, WindowDiagram } from "../components/diagrams/SummaryDiagrams";
import Figure from "../components/figure/Figure";
import T from "../components/ui/T";
import { AN, E8, e8bests, e8byN, e8frontier, e8overT, f2, windowRows } from "../lib/data";

export const metadata = { title: "Size and noise" };

export default function Page() {
  const bests = e8bests();
  return (
    <ChapterPage slug="size-and-noise">
      <Section n="4.1" id="setup" title="The experiment">
        <p className="lead">
          Groups of 10, 20, 40 and 80 agents, a source that moves every {E8.tauE} rounds on average, and four levels of
          false alarms, <T k="nu">ν</T> = 0, 0.25, 0.5 and 0.75. For each combination the model runs at seven commitments
          T, with self-reinforcement κ = {E8.kappa}, for 3000 rounds, twice (<Link href="/appendix/e8/">E8</Link>). The
          question is what the best commitment buys and what it costs.
        </p>
      </Section>

      <Section n="4.2" id="returns" title="Increasing returns to group size">
        <Figure id="scaling" wide title="Benefit and cost against group size" caption="At each group size and noise level the best commitment was chosen. Benefit (nats) rises with group size like ln(N − 1); structural cost stays near 2× whatever the size. Heavy noise lowers both: the group commits less, gains less and pays less.">
          <ScalingDiagram />
        </Figure>
        <ul>
          <li>With the best commitment, coordination recovers 94–99% of the possible <T k="benefit">benefit</T> up to 50%
            false alarms, at every size. At 75% it recovers 67–75%.</li>
          <li><T k="cost">Structural cost</T> stays at 1.8–2.0 times that of evenly spread attention at every size. Benefit
            per unit of cost therefore rises from 1.2 to 2.3 <T k="nat">nats</T> between 10 and 80 agents.</li>
          <li>Heavy noise lowers the cost (1.4–1.7×) because the group commits less. At 80 agents the return per unit of
            cost is unchanged.</li>
        </ul>
        <div className="fig-row">
          <Figure id="e8-benefit" title="Benefit at the best commitment" caption="As a share of the most possible, ln(N − 1).">
            <PlotFigure spec={{ kind: "lines", logX: true, xTicks: E8.ns, data: e8byN("frac"), x: "N", y: "y", series: "nu", ramp: "noise",
              xLabel: "group size N", yLabel: "benefit / ln(N − 1)" }} />
          </Figure>
          <Figure id="e8-per-cost" title="Benefit per unit of cost" caption="Nats per unit of structural cost. Larger groups coordinate more cheaply per nat at every noise level.">
            <PlotFigure spec={{ kind: "lines", logX: true, xTicks: E8.ns, data: e8byN("perCost"), x: "N", y: "y", series: "nu", ramp: "noise",
              xLabel: "group size N", yLabel: "benefit / cost (nats)" }} />
          </Figure>
        </div>
      </Section>

      <Section n="4.3" id="frontier" title="Noise lowers what coordination buys, not what it costs">
        <p>
          Plotting benefit against cost over the whole range of commitment shows the trade-off a group can choose from.
          Each curve runs from strong commitment (top right) to weak (bottom left). Noise moves the curve down, not to the
          right: the same structure buys less.
        </p>
        <div className="fig-row">
          {[10, 80].map((n) => (
            <Figure key={n} id={`e8-frontier-${n}`} title={`Cost against benefit, ${n} agents`} caption="One curve per noise level, over T > κ.">
              <PlotFigure spec={{ kind: "lines", data: e8frontier(n), x: "cost", y: "frac", series: "nu", ramp: "noise",
                xLabel: `structural cost (${n} agents)`, yLabel: "benefit / ln(N − 1)" }} />
            </Figure>
          ))}
        </div>
        <p>
          Noise is paid in commitment instead. The best T moves from 0.30 to 0.25, toward the lock-in edge: agents must
          bet harder on the current hub to average out false alarms. It is the attention version of the longer memory
          that noise selects (<Link href="/memory/">chapter 7</Link>).
        </p>
      </Section>

      <Section n="4.4" id="window" title="The window narrows">
        <p>
          Without noise, the regime that pays runs from the lock-in edge T = κ to <T k="Thalf">T½</T>. With noise, tracking
          falls below one half earlier. The usable window shrinks with group size, because T½ approaches κ like
          1/ln N, and with noise, by a similar fraction at every size.
        </p>
        <Figure id="window" wide title="The usable range of commitment" caption="From the lock-in edge (T = κ) to where tracking falls below one half. One bar per group size, one shade per noise level (lightest: perfect signal). Measured values; at ν = 0.75 for 40 and 80 agents the end comes from the reduced model, because the runs never reached one half.">
          <WindowDiagram />
        </Figure>
        <div className="fig-row">
          {[10, 80].map((n) => (
            <Figure key={n} id={`e8-tracking-${n}`} title={`Tracking against commitment, ${n} agents`} caption={`κ = ${E8.kappa}, T½ = ${f2(E8.tHalf(n))}. Near κ tracking survives noise up to ν = 0.5; toward T½ it falls early.`}>
              <PlotFigure spec={{ kind: "lines", logX: true, xTicks: E8.temps, data: e8overT(n, "tracking"), x: "T", y: "y", series: "nu", ramp: "noise",
                xLabel: `commitment T (${n} agents)`, yLabel: "tracking" }} />
            </Figure>
          ))}
        </div>
        <Figure id="window-fraction" title="Share of the window left" caption="Noise removes a similar fraction at every size: about 20% at ν = 0.25, half at 0.5 and 80% at 0.75.">
          <PlotFigure spec={{ kind: "lines", data: windowRows(), x: "nu", y: "w", series: "src", ramp: "size",
            xLabel: "false alarms ν", yLabel: "usable window / (T½ − κ)" }} />
        </Figure>
        <Takeaway>At 80 agents and 50% false alarms, commitment must sit within about 0.09 of the lock-in edge. Large, noisy groups gain the most from coordinating and have the least room for error.</Takeaway>
        <Details title="The numbers: best commitment, benefit, cost and tracking">
          <div className="tablewrap"><table>
            <thead><tr><th>N</th><th>ν</th><th>best T</th><th>T½</th><th>benefit (nats)</th><th>/ ln(N−1)</th><th>cost</th><th>benefit / cost</th><th>tracking</th></tr></thead>
            <tbody>{bests.map((b) => (
              <tr key={`${b.n}-${b.nu}`}><td>{b.n}</td><td>{b.nu}</td><td>{b.T}</td><td>{f2(E8.tHalf(b.n))}</td><td>{f2(b.benefit)}</td>
                <td>{f2(b.benefit / Math.log(b.n - 1))}</td><td>{f2(b.cost)}</td><td>{f2(b.benefit / b.cost)}</td><td>{f2(b.tracking)}</td></tr>
            ))}</tbody>
          </table></div>
        </Details>
        <Details title="The numbers: where tracking falls to one half">
          <div className="tablewrap"><table>
            <thead><tr><th>N</th><th>no noise (formula)</th><th>ν = 0.25</th><th>ν = 0.5</th><th>ν = 0.75</th><th>from</th></tr></thead>
            <tbody>{E8.ns.flatMap((n) => (["sim", "relay", "averaged"] as const).map((k) => (
              <tr key={`${n}-${k}`}><td>{k === "sim" ? n : ""}</td>
                <td>{f2(AN.tHalf.find((r) => r.n === n && r.nu === 0)!.closed, 3)}</td>
                {[0.25, 0.5, 0.75].map((nu) => <td key={nu}>{f2(AN.tHalf.find((r) => r.n === n && r.nu === nu)![k], 3)}</td>)}
                <td>{k === "sim" ? "simulation" : k === "relay" ? "relay-aware walk" : "averaged theory"}</td></tr>
            )))}</tbody>
          </table></div>
        </Details>
      </Section>

      <Section n="4.5" id="lockin-price" title="Lock-in pays the full price for nothing">
        <p>
          Below the lock-in edge (T = 0.15 here) the structural cost is the full 1.9–2.0 at every noise level, but the hubs
          sit on stale agents and the benefit is far below zero. It is the most expensive structure with the worst return.
          Spreading out is the cheap failure: little is paid and little is gained.
        </p>
      </Section>
    </ChapterPage>
  );
}
