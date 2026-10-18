import Link from "next/link";
import ChapterPage, { Details, Section, Takeaway } from "../components/chrome/ChapterPage";
import PlotFigure from "../components/diagrams/PlotFigure";
import { MechanismDiagram } from "../components/diagrams/SummaryDiagrams";
import Figure from "../components/figure/Figure";
import T from "../components/ui/T";
import { A4, A4_COLORS, a4Series, AN, E8, e8overT, f2, NU_COLORS } from "../lib/data";

export const metadata = { title: "Why the hub survives noise" };

export default function Page() {
  const mf = AN.meanField.filter((r) => r.nu === 0.5 && (r.T === 0.25 || r.T === 0.45));
  return (
    <ChapterPage slug="robustness">
      <Section n="5.1" id="puzzle" title="A puzzle: tracking holds where theory says it should fail">
        <p className="lead">
          Near the lock-in edge, tracking stays at 0.91–0.99 with up to 50% false alarms, at every group size. A simple
          theory says it should not.
        </p>
        <p>
          The theory averages the reward over the noise in the symmetric state: with probability 1 − ν + ν/N the news is
          at the source and it gains, otherwise a random rival gains (<T k="meanfield">noisy mean field</T>). Far from the
          edge (T = 0.45) it matches the simulation within 3% everywhere. Near the edge it falls far short.
        </p>
        <div className="tablewrap"><table>
          <thead><tr><th>N</th><th>T</th><th>simulation</th><th>averaged theory</th><th>with fluctuations</th><th>with relays</th></tr></thead>
          <tbody>{mf.map((r) => (
            <tr key={`${r.n}-${r.T}`}><td>{r.n}</td><td>{r.T}</td><td>{f2(r.sim, 3)}</td><td>{f2(r.averaged, 3)}</td><td>{f2(r.walk, 3)}</td><td>{f2(r.relay, 3)}</td></tr>
          ))}</tbody>
        </table></div>
        <p className="caption">Tracking at ν = 0.5. Adding the round-to-round fluctuations and the relay effect closes part of the gap, not all of it.</p>
      </Section>

      <Section n="5.2" id="switching" title="Switching effects off one at a time">
        <p>
          Every version of the theory keeps the symmetric state: all rivals of the source hold equal attention. The
          simulation does not. So the test is to run the simulation with that one difference removed: after every round,
          each agent&apos;s attention on its rivals is reset to their average, leaving the share on the source untouched. A
          second switch turns relays off by rewarding direct evidence instead of closeness (<Link href="/learning/">chapter 6</Link>).
        </p>
        <Figure id="mechanism" wide title="Why the hub keeps its place" caption="Left: false alarms leave the leftover attention on a few recent rivals, and uneven rivals pull less in total (score ∝ weight^κ/T, a concave curve). Middle: news from a false alarm still passes through the hub. Right: tracking at 10 agents, ν = 0.5, T = 0.25, removing one effect at a time.">
          <MechanismDiagram />
        </Figure>
        <div className="fig-row">
          {[10, 80].map((n) => (
            <Figure key={n} id={`a4-${n}`} title={`The test, ${n} agents`} caption="Tracking against T at ν = 0.5 for every condition and the reduced models. Equalizing the rivals drops each simulation onto its walk.">
              <PlotFigure spec={{ kind: "lines", logX: true, xTicks: A4.temps, data: a4Series(n, 0.5), x: "T", y: "y", series: "cond", colors: A4_COLORS,
                xLabel: `commitment T (${n} agents, ν = 0.5)`, yLabel: "tracking" }} />
            </Figure>
          ))}
        </div>
        <ol>
          <li><b>The theory is right about the symmetric state.</b> With rivals equalized, each simulation matches its
            reduced model within 0.03 at 20 agents or more, and 0.06 at 10.</li>
          <li><b>Uneven rivals carry the whole excess near the edge.</b> At 10 agents, ν = 0.5, T = 0.25, tracking falls
            from 0.94 to 0.75 when rivals are equalized; at 80 agents from 0.94 to 0.82. Far from the edge it changes
            nothing.</li>
          <li><b>Relays amplify it.</b> Uneven rivals add 0.20 to tracking with relays and 0.09 without.</li>
        </ol>
      </Section>

      <Section n="5.3" id="concavity" title="Why uneven rivals pull less">
        <p>
          A link&apos;s pull grows like its weight to the power κ/T. Above the lock-in edge that power is below one, so
          the curve is concave: doubling a link&apos;s weight less than doubles its pull. Each false alarm deposits a
          little extra attention on one random rival, which then decays over the next few rounds. The leftover attention
          is therefore uneven, concentrated on a few recent rivals, and uneven weight has less total pull than the same
          weight spread evenly. The source faces less competition and keeps more reward.
        </p>
        <p>
          The <T k="heterogeneity">competition factor</T>, total pull divided by the pull of evenly spread weight, is
          0.87–0.94 at T = 0.25 and approaches 1 as T rises, exactly where the excess tracking appears and disappears. A
          single agent&apos;s uneven column, with the rest of the network kept symmetric, recovers 40–100% of the excess
          (typically two thirds). The rest comes from relay distances, which also become uneven.
        </p>
        <Details title="The test in numbers (T = 0.25)">
          <div className="tablewrap"><table>
            <thead><tr><th>N</th><th>ν</th><th>position free</th><th>rivals equal</th><th>relay walk</th><th>column walk</th><th>evidence free</th><th>rivals equal</th><th>symmetric walk</th><th>competition</th></tr></thead>
            <tbody>{A4.rows.filter((r) => r.T === 0.25).map((r) => (
              <tr key={`${r.n}-${r.nu}`}><td>{r.n}</td><td>{r.nu}</td><td>{f2(r.rwed, 3)}</td><td>{f2(r.rwed_sym, 3)}</td><td>{f2(r.relay_walk, 3)}</td>
                <td>{f2(r.column_rwed, 3)}</td><td>{f2(r.likelihood, 3)}</td><td>{f2(r.likelihood_sym, 3)}</td><td>{f2(r.sym_walk, 3)}</td><td>{f2(r.competition_lik)}</td></tr>
            ))}</tbody>
          </table></div>
          <p>Full derivations: <Link href="/appendix/analysis/">Analysis A1–A4</Link>.</p>
        </Details>
      </Section>

      <Section n="5.4" id="relays" title="Relays: the hub passes on even false news">
        <p>
          When a false alarm fires at a random agent j, closeness is measured from j. Everyone listens mostly to the hub,
          so the hub is the best-placed relay for j&apos;s news too, and it keeps more reward than an ordinary rival would.
          This is the <T k="relay">relay effect</T>. It only exists when links are rewarded for position in the network,
          not for direct evidence, and it is why learning through others is more robust to noise (<Link href="/learning/">chapter 6</Link>).
        </p>
      </Section>

      <Section n="5.5" id="trace" title="The visible trace: loops among the rivals">
        <p>
          The same mechanism shows in the shape of the network. With noise, treeness holds at the 0.88 plateau while{" "}
          <T k="ff">feedforwardness</T> falls (0.88 → 0.57–0.78 at T = 0.25): the hub stays, and the short-lived side hubs
          form loops among the rivals.
        </p>
        <Figure id="e8-ff" title="Feedforwardness against commitment, 80 agents" caption="With a perfect signal F sits on the plateau through the window; noise lowers it even where tracking is still near 1.">
          <PlotFigure spec={{ kind: "lines", logX: true, xTicks: E8.temps, data: e8overT(80, "F"), x: "T", y: "y", series: "nu", colors: NU_COLORS,
            xLabel: "commitment T (80 agents)", yLabel: "feedforwardness F" }} />
        </Figure>
        <Takeaway>The loops that appear under noise are not a malfunction. They are how the group absorbs false alarms; equalize them away and the hub becomes fragile.</Takeaway>
      </Section>
    </ChapterPage>
  );
}
