/** Small lattice drawn from model output. Edge width and opacity follow the weight on a log scale over three decades
 *  (relative to the panel's largest weight), an arrow points to the node holding the stronger direction, and the
 *  source is ringed. Server-rendered SVG. */
type Props = { nodes: number[][]; edges: number[][]; W: number[][]; source: number; label: string; color: string };

export default function NetworkPicture({ nodes, edges, W, source, label, color }: Props) {
  const S = 34, pad = 18;
  const xs = nodes.map((p) => p[0]), ys = nodes.map((p) => p[1]);
  const maxX = Math.max(...xs), maxY = Math.max(...ys);
  const X = (i: number) => pad + nodes[i][0] * S;
  const Y = (i: number) => pad + (maxY - nodes[i][1]) * S;
  const w = edges.map(([a, b]) => Math.max(W[a][b], W[b][a]));
  const wmax = Math.max(...w, 1e-300);
  const id = `ah-${label.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${2 * pad + maxX * S} ${2 * pad + maxY * S}`} className="netpic" role="img" aria-label={label}>
      <defs>
        <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" style={{ fill: color }} />
        </marker>
      </defs>
      {edges.map(([a, b], e) => {
        const rel = Math.max(0, Math.min(1, (Math.log10(Math.max(w[e], 1e-300) / wmax) + 3) / 3));
        if (rel <= 0) return <line key={e} x1={X(a)} y1={Y(a)} x2={X(b)} y2={Y(b)} className="net-faint" />;
        const [from, to] = W[a][b] >= W[b][a] ? [a, b] : [b, a];
        const sx = X(from), sy = Y(from), tx = X(to), ty = Y(to);
        const k = 0.72;
        return (
          <line key={e} x1={sx} y1={sy} x2={sx + (tx - sx) * k} y2={sy + (ty - sy) * k}
            style={{ stroke: color, strokeWidth: 0.5 + 4 * rel, opacity: 0.2 + 0.8 * rel }}
            markerEnd={rel > 0.55 ? `url(#${id})` : undefined} />
        );
      })}
      {nodes.map((_, i) => (
        <circle key={i} cx={X(i)} cy={Y(i)} r={i === source ? 6 : 3.2} className={i === source ? "net-source" : "net-node"} />
      ))}
    </svg>
  );
}
