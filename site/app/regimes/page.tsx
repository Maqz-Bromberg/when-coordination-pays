import Link from "next/link";
import ChapterPage, { Details, Section, Takeaway } from "../components/chrome/ChapterPage";
import PlotFigure from "../components/diagrams/PlotFigure";
import RegimeMap from "../components/diagrams/RegimeMap";
import { RegimeDiagram } from "../components/diagrams/SummaryDiagrams";
import Figure from "../components/figure/Figure";
import Cite from "../components/ui/Cite";
import T from "../components/ui/T";
import { AN, E5S, e2collapse, e5lines, e5regimes, e5structures, f2, REGIME_COLORS } from "../lib/data";

export const metadata = { title: "Three regimes" };

const TICKS = [0.05, 0.1, 0.2, 0.3, 0.5, 1, 2];
const PERS: [string, string][] = [
  ["constant", "Constant source: coordinated hierarchy below T½, spread out above. The boundary is the exact formula at every κ."],
  ["markov 100", "Source moves every 100 rounds on average: lock-in on stale hubs below T = κ, coordinated hierarchy between κ and T½, spread out above."],
  ["random", "A new random source every round: no lasting hierarchy for κ > 0; below T = κ the network locks onto stale agents."],
];

export default function Page() {
  const { tc, th } = e5lines();
  return (
    <ChapterPage slug="regimes">
      <Section n="3.1" id="three" title="Lock-in, coordinated hierarchy, spread out">
        <p className="lead">
          Along the commitment axis a group falls into one of three regimes. Which one depends on how commitment{" "}
          <T k="T">T</T> compares with self-reinforcement <T k="kappa">κ</T>, and on how big the group is.
        </p>
        <Figure id="regimes" wide title="Three regimes along the commitment axis" caption="Numbers are measured: 40 agents, source moves every 300 rounds on average, ν = 0.25, κ = 0.2, at T = 0.15, 0.25 and 0.8. Benefit is the share of the best possible; cost is relative to evenly spread attention.">
          <RegimeDiagram />
        </Figure>
        <ul>
          <li><b><T k="overbetting">Lock-in</T> (T &lt; κ).</b> Commitment outruns self-reinforcement in the wrong
            direction: whoever is ahead gets further ahead, regardless of where the news is. The group builds a hub, pays
            the full structural cost, and the hub sits on whoever led early. Benefit is far below zero.</li>
          <li><b><T k="hierarchy">Coordinated hierarchy</T> (κ &lt; T &lt; T½).</b> A single hub forms on the current
            source, and when the source moves, attention follows it. This is the regime that pays.</li>
          <li><b><T k="distributed">Spread out</T> (T &gt; T½).</b> No one commits. Little is paid, little is gained.</li>
        </ul>
      </Section>

      <Section n="3.2" id="map" title="The regime map">
        <p>
          The regime map runs the model over 14 commitments, four levels of self-reinforcement and five source
          schedules, from a source that never moves to one that moves every round (30 agents, 3000 rounds, three repeats
          each; <Link href="/appendix/e5/">E5</Link>). Each square is the majority regime. The solid line is T = κ and the
          dashed line T½, both from the exact formulas below, not fitted. Hover over or tap a square to see the network
          that run built: a star around the source in the coordinated regime, a star around some other agent under
          lock-in, an even web when attention is spread.
        </p>
        {PERS.map(([p, cap]) => (
          <Figure key={p} id={`e5-${p.replace(/\s/g, "")}`} wide title={`Regime map, ${p} source`} caption={cap}>
            <RegimeMap cells={e5regimes(p)} nets={e5structures(p)} colors={REGIME_COLORS} xTicks={TICKS}
              xLabel={`commitment T (${p} source)`} n={E5S.n} minW={E5S.minW}
              lines={[{ data: tc, label: "T = κ", dy: -10 }, { data: th, label: "T½", dash: true, dy: 10 }]} />
          </Figure>
        ))}
        <p>
          Lock-in on stale hubs needs both self-reinforcement and a moving source: with κ = 0 nothing locks in, and with
          a source that never moves the early leader is the right one anyway.
        </p>
      </Section>

      <Section n="3.3" id="boundaries" title="Exact boundaries">
        <p>
          In the symmetric state, every agent puts the same share x on the source and splits the rest evenly. The model
          then reduces to one number, and the fixed point can be written down:
        </p>
        <span className="eq">u* = ρ<sup>(1−κ)/(T−κ)</sup>,   x* = u* / (u* + N − 2),   T½ = κ + (1 − κ) ln ρ / ln(N − 2).</span>
        <p>
          The hub holds a majority while T &lt; T½, and the symmetric state is stable only for T &gt; κ. The window between
          them has width (1 − κ) ln ρ / ln(N − 2): it shrinks as the group grows. Rescaled by that width, the share on the
          source for every group size falls on one curve and crosses one half at the same point (<Link href="/appendix/e2/">E2</Link>).
        </p>
        <Figure id="e2-collapse" title="One curve for every group size" caption="Share of attention on a constant source against the rescaled temperature z = T_eff ln(N − 2)/ln ρ, with T_eff = (T − κ)/(1 − κ) and κ = 0. Every group size crosses one half at z = 1, as the formula predicts.">
          <PlotFigure spec={{ kind: "lines", logX: true, data: e2collapse(), x: "z", y: "attention", series: "N", ramp: "size",
            xLabel: "z = T_eff · ln(N − 2) / ln ρ", yLabel: "share on the source" }} />
        </Figure>
        <Details title="In detail: why the reduction is exact (A1)">
          <p>
            In the symmetric state the source&apos;s own attention is spread evenly, so every relay is equivalent under the
            permutations that fix the source. The walk distance from the source is then the same to every other agent, at
            any walk cost δ, and the common distance factor cancels from the reward ratio. What is left is
            (ρ<sup>1−κ</sup> u<sup>κ</sup>)<sup>1/T</sup> with u = x/p, whose fixed point is u*. The simulation reproduces
            x* to 10⁻⁹ at δ = 1 and δ = 10. See <Link href="/appendix/analysis/">Analysis A1–A4</Link>.
          </p>
        </Details>
        <Details title="In detail: stability through a kink (A2)">
          <p>
            The thesis sets the source&apos;s own distance to the smallest relay distance divided by ρ. At the symmetric
            point all relays tie, so the update has a kink exactly at its fixed point. Linearizing one smooth piece at a
            time, {AN.spectra.rows[AN.spectra.rows.length - 1].n_bulk} of {AN.spectra.rows[0].n_modes} directions contract at
            exactly (1 + εκ/T)/(1 + ε), the rate of the one-number reduction, and the rest lie 0.01–4% above it. The
            spectral radius crosses 1 at T = κ: no instability hides in the full network.
          </p>
          <div className="tablewrap"><table>
            <thead><tr><th>T</th><th>x*</th><th>bulk rate</th><th>spectral radius</th><th>stable</th></tr></thead>
            <tbody>{AN.spectra.rows.map((r) => (
              <tr key={r.T}><td>{r.T}</td><td>{f2(r.x_star, 3)}</td><td>{f2(r.bulk, 4)}</td><td>{f2(r.radius, 4)}</td><td>{r.radius < 1 ? "yes" : "no"}</td></tr>
            ))}</tbody>
          </table></div>
          <p className="caption">N = {AN.spectra.n}, κ = {AN.spectra.kappa}, ε = 1. For T &lt; κ the unstable interior point is used.</p>
        </Details>
      </Section>

      <Section n="3.4" id="lockin" title="Lock-in is decided at the start">
        <p>
          Below T = κ, which agent wins each listener is fixed by the starting attention. If a listener initially gives
          its strongest rival more than ρ<sup>(1−κ)/(κ−T)</sup> times what it gives the source, it locks onto the rival;
          otherwise onto the source. The signal never gets a say. This is the network version of lock-in by historical
          accident in competing technologies <Cite id="arthur1989competing" />.
        </p>
        <Details title="In detail: the separatrix and how well it predicts (A3)">
          <p>
            For a column dominated by the source s and the strongest rival q, the log-ratio l = ln(w<sub>s</sub>/w<sub>q</sub>)
            has a fixed point l* = (1 − κ) ln ρ / (T − κ), unstable for T &lt; κ. Agent by agent, the prediction matches the
            simulated winner 95–100% of the time ({AN.separatrix.n} agents, 3 repeats).
          </p>
          <div className="tablewrap"><table>
            <thead><tr><th>κ</th><th>selection</th><th>T</th><th>threshold ratio</th><th>agreement</th><th>locked: predicted</th><th>observed</th></tr></thead>
            <tbody>{AN.separatrix.rows.map((r) => (
              <tr key={`${r.kappa}-${r.selection}-${r.T}`}><td>{r.kappa}</td><td>{r.selection}</td><td>{r.selection === "cut" ? "→ 0" : r.T}</td>
                <td>{f2(r.ratio)}</td><td>{f2(r.agreement)}</td><td>{f2(r.predicted_locked)}</td><td>{f2(r.observed_locked)}</td></tr>
            ))}</tbody>
          </table></div>
        </Details>
        <Takeaway>The safe setting is just above the lock-in edge: close enough to κ to commit, far enough not to freeze.</Takeaway>
      </Section>
    </ChapterPage>
  );
}
