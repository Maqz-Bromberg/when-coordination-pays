import Link from "next/link";
import ChapterPage, { Section, Takeaway } from "../components/chrome/ChapterPage";
import Cite from "../components/ui/Cite";

export const metadata = { title: "Implications and limits" };

const IMPLICATIONS: [string, React.ReactNode][] = [
  ["Set commitment relative to self-reinforcement, not relative to the signal.",
    <>The safe setting is just above the lock-in edge. Below it, early advantage decides the leader whatever the
      evidence, as with competing technologies <Cite id="arthur1989competing" />. The remedies are lowering
      self-reinforcement or occasionally resetting attention, not better signals (<Link href="/regimes/#lockin">3.4</Link>).</>],
  ["Larger groups gain more per unit of structure but have less room for error.",
    <>Coordination has increasing returns to size, and the tolerance for a miscalibrated commitment shrinks like
      1/ln N (<Link href="/size-and-noise/">chapter 4</Link>).</>],
  ["Against noisy signals, invest in signal quality or memory rather than structure.",
    <>Noise does not raise the cost of the hub. It lowers what the hub delivers and narrows the safe range. Where a
      longer memory is possible, it closes most of the gap to ideal inference (<Link href="/learning/#memory">6.4</Link>).</>],
  ["Judge coordination by function, not by shape.",
    <>A clear hub looks the same whether it is current or stale. Tracking, and benefit relative to information cost,
      tell them apart (<Link href="/structure/#function">8.4</Link>).</>],
  ["Side loops under noise are part of how the system copes.",
    <>They absorb false alarms by splitting the leftover attention unevenly; removing them makes the hub more fragile
      (<Link href="/robustness/">chapter 5</Link>).</>],
  ["Learning through intermediaries is cheap error correction when memory is short.",
    <>Where memory can be long, careful individual inference is the better benchmark (<Link href="/learning/">chapter 6</Link>).</>],
  ["Memory and pace co-adapt, with a free-rider problem.",
    <>When a group&apos;s memory shapes how fast its world changes, it settles on a stable memory that is shorter than
      the one best for the group (<Link href="/memory/#feedback">7.2</Link>).</>],
];

export default function Page() {
  return (
    <ChapterPage slug="implications">
      <Section n="9.1" id="implications" title="What follows, if the model's assumptions hold">
        <p className="lead">
          The model is abstract: agents, attention, a source. It speaks to any group that has to decide whom to listen to
          while the source of useful information moves, such as teams and organizations, communities of experts, sensor
          and communication networks, or animal groups. These are implications of the model; how far they carry to any
          real system is untested.
        </p>
        <ol className="implications">
          {IMPLICATIONS.map(([t, body]) => (
            <li key={t}><b>{t}</b> {body}</li>
          ))}
        </ol>
      </Section>

      <Section n="9.2" id="limits" title="Limits">
        <ul>
          <li><b>Who can listen to whom.</b> Every agent can listen to every other (complete networks), except in the grid
            study of chapter 8. Sparse networks change relays, and with them part of the noise robustness.</li>
          <li><b>Parameters.</b> The cost and noise studies fix self-reinforcement at κ = 0.2 and use the thesis&apos;s fast
            memory (ε = 1). The regime map and the memory study vary them; the cost results have not been repeated across κ.</li>
          <li><b>Scale and sampling.</b> Groups have at most 80 agents, with 2–4 random repeats per setting, run on a
            laptop. Effects reported here are large compared with the spread between repeats, but small differences
            (a few percent) are not resolved.</li>
          <li><b>Agents follow fixed rules.</b> They do not strategize, communicate about the source, or change their own
            parameters, except in the evolution experiments of chapter 7.</li>
          <li><b>Cost is a proxy.</b> The structural cost is borrowed from transport networks. It prices what a structure
            would cost to use, not anything the agents pay in the model.</li>
        </ul>
      </Section>

      <Section n="9.3" id="open" title="Open questions">
        <ul>
          <li>How much of the noise robustness survives on sparse networks, where relays matter more?</li>
          <li>If commitment and memory could evolve together, would groups find the narrow window by themselves?</li>
          <li>A model in which agents pay the structural cost would close the loop between attention and transport.</li>
          <li>A two-class reduction (source, recent rivals, the rest) should capture the remaining part of the noise
            robustness analytically.</li>
        </ul>
        <Takeaway>The headline: coordination pays most in large groups and costs the same at every size, but the price of noise is precision. The window of commitment that works is narrow, and it is easy to fall out of it on the expensive side.</Takeaway>
      </Section>
    </ChapterPage>
  );
}
