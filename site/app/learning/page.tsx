import Link from "next/link";
import ChapterPage, { Details, Section, Takeaway } from "../components/chrome/ChapterPage";
import PlotFigure from "../components/diagrams/PlotFigure";
import { RulesDiagram } from "../components/diagrams/SummaryDiagrams";
import Figure from "../components/figure/Figure";
import Cite from "../components/ui/Cite";
import T from "../components/ui/T";
import { best9, E8, e9byNu, e9overT, f2, m9, RULE_COLORS, RULE_NAMES } from "../lib/data";

export const metadata = { title: "Learning through others" };

export default function Page() {
  const temps = E8.temps.filter((T) => T > E8.kappa);
  return (
    <ChapterPage slug="learning">
      <Section n="6.1" id="rules" title="Two ways to decide whom to listen to">
        <p className="lead">
          So far each agent rewards a link for its position: how close the sender sits to the news, counting paths
          through others. The natural alternative rewards direct evidence: how likely the observation is if the sender
          were the source.
        </p>
        <Figure id="rules" wide title="Position against evidence after a false alarm" caption="The highlighted ring is who gets the credit. Right: benefit at the best commitment, 80 agents, as a share of the most possible. The ideal statistician knows the noise level and the pace and uses every past signal.">
          <RulesDiagram />
        </Figure>
        <p>
          <b>Rewarding position</b> is a social-learning rule: listen to whoever is closest to the news, including
          intermediaries. <b>Rewarding evidence</b> (<T k="likelihood">likelihood reward</T>) is a betting or inference
          rule: each agent learns for itself which agent is the source, like a Kelly bettor or a learner weighting experts.
          It keeps the strength factor A<sup>κ</sup> and replaces closeness with a factor ρ for the agent where the news
          appeared and 1 for everyone else. In the symmetric state the two rules are identical, so any difference comes
          from relays. As a benchmark, the <T k="bayes">ideal statistician</T> computes the exact posterior over the
          source from every past signal, knowing ν and τ_E (<Link href="/appendix/e9/">E9</Link>).
        </p>
      </Section>

      <Section n="6.2" id="results" title="Position wins under noise">
        <div className="fig-row">
          {[10, 80].map((n) => (
            <Figure key={n} id={`e9-benefit-${n}`} title={`Benefit against noise, ${n} agents`} caption="At the best commitment, as a share of ln(N − 1). Without noise all rules coincide.">
              <PlotFigure spec={{ kind: "lines", data: e9byNu(n), x: "nu", y: "y", series: "rule", colors: RULE_COLORS,
                xLabel: `false alarms ν (${n} agents)`, yLabel: "benefit / ln(N − 1)" }} />
            </Figure>
          ))}
        </div>
        <ul>
          <li>At ν = 0.5, rewarding position recovers 94–98% of the possible benefit and rewarding evidence 86–91%;
            tracking is 0.91–0.95 against 0.72–0.79. At ν = 0.25 they are within one point.</li>
          <li>Rewarding position is within 1–3% of the ideal statistician up to 50% false alarms.</li>
          <li>The structural cost is set by the structure, not the rule: the ideal statistician builds the same hub at
            the same 1.8–2.0×.</li>
        </ul>
        <Figure id="e9-tracking" title="Tracking against commitment, 40 agents, ν = 0.5" caption="Position keeps the hub on the source near κ; the evidence rules lose a fifth to a third of it. The ideal statistician does not depend on T.">
          <PlotFigure spec={{ kind: "lines", logX: true, xTicks: temps, data: e9overT(40, 0.5, (r, T) => m9(r, 40, 0.5, T, "tracking")), x: "T", y: "y", series: "rule", colors: RULE_COLORS,
            xLabel: "commitment T (40 agents, ν = 0.5)", yLabel: "tracking" }} />
        </Figure>
      </Section>

      <Section n="6.3" id="tuning" title="Tuning evidence to the noise backfires">
        <p>
          An evidence rule tuned to the true noise uses the real likelihood ratio, 1 + N(1 − ν)/ν, instead of ρ. It does
          worse (76–82% at ν = 0.5). The update averages rewards, (A + ε·reward)/(1 + ε); it does not multiply beliefs as
          Bayes&apos; rule does. A sharper likelihood therefore does not accumulate evidence. It makes every round copy
          the latest signal, false or not.
        </p>
      </Section>

      <Section n="6.4" id="memory" title="Where the ideal statistician pulls ahead: memory">
        <p>
          At 75% false alarms the gap opens: 67–75% for position against 90–97% for the ideal statistician. The reason is
          memory, not the reward. With ε = 1 the group averages over about 1.4 rounds; the statistician uses every signal
          since the source last moved. Noise selects a longer memory (<Link href="/memory/">chapter 7</Link>), and this is
          where the group pays for not having it.
        </p>
        <Figure id="e9-calibration" title="Calibration gap, 40 agents, ν = 0.5" caption="Benefit minus information cost (nats). The ideal statistician sits near 0 (calibrated). The model's rules are close to calibrated at their best T and under-committed in the middle of the window; at high T both measures shrink. Below κ (not shown) the gap is about −690: over-betting.">
          <PlotFigure spec={{ kind: "lines", logX: true, xTicks: temps, data: e9overT(40, 0.5, (r, T) => m9(r, 40, 0.5, T, "benefit") - m9(r, 40, 0.5, T, "info_cost")),
            x: "T", y: "y", series: "rule", colors: RULE_COLORS, xLabel: "commitment T (40 agents, ν = 0.5)", yLabel: "benefit − information cost" }} />
        </Figure>
        <Details title="The numbers: each rule at its best commitment">
          <div className="tablewrap"><table>
            <thead><tr><th>N</th><th>ν</th><th>rule</th><th>best T</th><th>benefit / ln(N−1)</th><th>tracking</th><th>structural cost</th><th>information cost</th></tr></thead>
            <tbody>{[10, 80].flatMap((n) => [0.25, 0.5, 0.75].flatMap((nu) => Object.keys(RULE_NAMES).map((rule) => {
              const T = best9(rule, n, nu);
              return (<tr key={`${n}-${nu}-${rule}`}><td>{n}</td><td>{nu}</td><td>{RULE_NAMES[rule]}</td><td>{T ?? "–"}</td>
                <td>{f2(m9(rule, n, nu, T, "benefit") / Math.log(n - 1))}</td><td>{f2(m9(rule, n, nu, T, "tracking"))}</td>
                <td>{f2(m9(rule, n, nu, T, "cost"))}</td><td>{f2(m9(rule, n, nu, T, "info_cost"))}</td></tr>);
            })))}</tbody>
          </table></div>
        </Details>
      </Section>

      <Section n="6.5" id="meaning" title="What each rule stands for">
        <ul>
          <li><b>Position</b> rewards being close to where news appears, directly or through others. It describes routing
            and social learning: listening to whoever is closest to the news, as in citation, rumour or supply networks.
            Its strength under noise is collective: a false alarm is partly credited back to the true hub, because the hub
            is the best relay to everyone.</li>
          <li><b>Evidence</b> rewards the observation&apos;s likelihood under the hypothesis that the sender is the source. It
            describes individual inference: Kelly allocation, multiplicative weights, Bayesian updating. Each agent learns
            alone, as the agents of niche-learning models do <Cite id="lee2024constructing" />.</li>
        </ul>
        <Takeaway>Learning through intermediaries is cheap error correction when memory is short. Where memory can be long, careful individual inference is the benchmark to beat.</Takeaway>
      </Section>
    </ChapterPage>
  );
}
