/** The figures with which Corominas-Murtra, Goñi, Solé & Rodríguez-Caso (2013) introduce hierarchy coordinates,
 *  one per slide, with what each shows in this site's terms. Images are cropped from arXiv:1303.2503 (Figs. 1 and 2
 *  of the article, Figs. 7, 8, 11, 16 and 17 of its appendix) into public/hc/. Server-rendered; StepCarousel switches. */
import { withBase } from "../../lib/base";
import Cite from "../ui/Cite";
import StepCarousel, { type Step } from "../ui/StepCarousel";

type Slide = { key: string; label: string; fig: string; file: string; alt: string; text: React.ReactNode; tall?: boolean };

const SLIDES: Slide[] = [
  { key: "define", label: "Defining hierarchy", fig: "Fig. 1", file: "cm2013-fig1.jpg", tall: true,
    alt: "A tree, an inverted tree, a crossing graph and a graph with cycles, with their paths from top to bottom nodes and cone icons",
    text: <>Four shapes: a tree (a), an inverted tree (d), a crossing feedforward graph (g) and a graph with cycles (j). The
      middle column traces the four paths from the top nodes (M) to the bottom ones (μ). The tree has many ways down and
      one way back up, so its forward path entropy beats the backward one and T = 1; the inverted tree is the reverse,
      T = −1; the crossing graph is balanced, T = 0. Cycles (j) are first collapsed into weighted nodes (k). The cones
      on the right are the authors&apos; icons: point up for a pyramid, balls for collapsed cycles.</> },
  { key: "condense", label: "Collapse loops", fig: "Appendix Fig. 7", file: "cm2013-fig7.png",
    alt: "A directed graph, its strongly connected components circled, and the condensed graph with node weights",
    text: <>Every strongly connected component, a set of nodes that can all reach each other, collapses into one node
      weighted by its size: here a loop of four becomes a node of weight 4. What is left has no cycles, so it has tops
      and bottoms, and paths between them can be counted. In this model a loop is a group of agents who listen to each
      other in a circle.</> },
  { key: "layers", label: "Peel layers", fig: "Appendix Fig. 8", file: "cm2013-fig8.png",
    alt: "A directed acyclic graph peeled into layers from the bottom and from the top",
    text: <>Leaf removal peels the acyclic graph from the bottom (ω₁, ω₂, …) or from the top (ω̃₁, …). Treeness is
      averaged over the whole graph and every peeled subgraph, so it sees hierarchy at every level, not only between the
      very top and the very bottom.</> },
  { key: "order", label: "Orderability", fig: "Appendix Fig. 11", file: "cm2013-fig11.png",
    alt: "A graph of seven nodes with a loop of three circled",
    text: <>Orderability is the share of nodes that sit in no loop. Four of these seven nodes are outside the circled
      loop, so O = 4/7. In the attention networks here, a rival group listening in a circle lowers O.</> },
  { key: "compute", label: "All three, computed", fig: "Appendix Fig. 16", file: "cm2013-fig16.png", tall: true,
    alt: "The full computation of treeness, feedforwardness and orderability on one example graph",
    text: <>The whole computation on one example. Condense, layer, then: treeness compares forward and backward path
      entropies, f = (H<sub>f</sub> − H<sub>b</sub>)/max(H<sub>f</sub>, H<sub>b</sub>), averaged over the graph and its
      layers (T = −0.55: this graph converges more than it fans out); feedforwardness is the share of each path&apos;s
      weight outside collapsed loops (F = 0.56); orderability counts nodes outside loops (O = 3/7 = 0.43).</> },
  { key: "gallery", label: "The cube", fig: "Appendix Fig. 17", file: "cm2013-fig17.png",
    alt: "Toy graphs placed at their coordinates in the treeness, feedforwardness, orderability cube",
    text: <>Toy graphs at their coordinates (red). Pyramids sit at the top right, (1, 1, 1); inverted pyramids at the top
      left, (−1, 1, 1); loops pull networks toward O = 0 and F = 0. Some places cannot be reached: F = 1 only
      happens with O = 1. The paths in the next figure move through this same cube.</> },
  { key: "real", label: "Real networks", fig: "Fig. 2", file: "cm2013-fig2.jpg",
    alt: "The morphospace with icons, random graph ensembles, and 125 real networks",
    text: <>(a) Regions of the cube and their icons. (b–c) Random graphs fill a sheet from bow-tie shapes to sparse
      trees. (d) 125 real networks: software and gene regulation near the top, food webs in the middle, language,
      metabolism and neurons lower down.</> },
];

export default function HierarchyPaperFigures() {
  const items: Step[] = SLIDES.map((s) => ({
    key: s.key, label: s.label,
    node: (
      <figure className="hpf">
        {/* eslint-disable-next-line @next/next/no-img-element -- static export, plain image */}
        <img src={withBase(`/hc/${s.file}`)} alt={s.alt} className={s.tall ? "hpf-img hpf-tall" : "hpf-img"} loading="lazy" />
        <figcaption>
          <p>{s.text}</p>
          <p className="hpf-credit">{s.fig} of <Cite id="corominas2013originsheirarchy" bare />, PNAS 110:13316, cropped
            from arXiv:1303.2503. © National Academy of Sciences; reproduced for non-commercial, educational use.</p>
        </figcaption>
      </figure>
    ),
  }));
  return <StepCarousel items={items} label="Hierarchy coordinates in the original paper" />;
}
