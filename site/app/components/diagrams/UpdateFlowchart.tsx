/** Flowchart of the shared E6 update: every cell runs the same loop and differs only in two boxes. */
export default function UpdateFlowchart() {
  const box = (x: number, y: number, w: number, h: number, title: string, lines: string[], accent?: string) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} className="fc-box" style={accent ? { stroke: accent } : undefined} />
      <text x={x + 12} y={y + 22} className="fc-title">{title}</text>
      {lines.map((l, i) => <text key={i} x={x + 12} y={y + 42 + 17 * i} className="fc-body">{l}</text>)}
    </g>
  );
  const arrow = (d: string) => <path d={d} className="fc-arrow" markerEnd="url(#fc-head)" />;
  return (
      <div className="plot">
        <svg viewBox="0 0 1070 400" role="img" aria-labelledby="fc-t fc-d" className="flowchart">
          <title id="fc-t">The shared update loop of the E6 factorial</title>
          <desc id="fc-d">A source is seeded; each edge gets a usage, either a distance score or a current; the usage is
            raised to the power p; the result is normalized per node or globally; and the weights move a fraction eta
            toward it. The two choices, usage and budget, define the four cells.</desc>
          <defs>
            <marker id="fc-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className="fc-headfill" />
            </marker>
          </defs>
          {box(20, 130, 150, 90, "1 · Seed source", ["s(t) from the", "schedule"])}
          {box(210, 20, 240, 100, "2a · Distance score", ["U_ki = D_k^(κ−1) · W_ki^κ", "D = random-walk distance", "from s (2020 thesis)"], "var(--ss)")}
          {box(210, 230, 240, 100, "2b · Current", ["U_ki = I_e², Kirchhoff current", "when s broadcasts to all", "(transport networks)"], "var(--tr)")}
          {box(490, 130, 185, 90, "3 · Concentrate", ["R ∝ U^p", "large p: winner-take-all"])}
          {box(715, 20, 170, 100, "4a · Per-node budget", ["each node's in-weights", "sum to 1 (attention)"], "var(--ss)")}
          {box(715, 230, 170, 100, "4b · Global budget", ["all weights sum to 1", "(material)"], "var(--tr)")}
          {box(905, 130, 155, 90, "5 · Remember", ["W ← (1−η)·W + η·R"])}
          {arrow("M170 160 C 190 160, 190 70, 208 70")}
          {arrow("M170 190 C 190 190, 190 280, 208 280")}
          {arrow("M450 70 C 470 70, 470 160, 488 160")}
          {arrow("M450 280 C 470 280, 470 190, 488 190")}
          {arrow("M675 160 C 695 160, 695 70, 713 70")}
          {arrow("M675 190 C 695 190, 695 280, 713 280")}
          {arrow("M885 70 C 897 70, 897 160, 903 160")}
          {arrow("M885 280 C 897 280, 897 190, 903 190")}
          {arrow("M982 220 L 982 365 L 95 365 L 95 222")}
          <text x={540} y={388} className="fc-body" textAnchor="middle">next step: usage is recomputed from the new weights</text>
          <text x={330} y={182} className="fc-fork" textAnchor="middle">usage: one of</text>
          <text x={800} y={182} className="fc-fork" textAnchor="middle">budget: one of</text>
        </svg>
      </div>
  );
}
