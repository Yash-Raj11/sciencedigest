/**
 * Satori draws a subset of HTML and CSS, and fails quietly where it does not: a stacked layout
 * collapses, a class name is ignored, a missing glyph becomes a box. So the slide tree is checked
 * before a pixel is drawn, and the render stops on any problem:
 *
 *   - display: flex on every element with children (svg internals excepted);
 *   - inline styles only: no className, no tw;
 *   - host elements only: art components are called as functions, so the whole tree is visible here;
 *   - every character is drawn by the font in effect where it sits (see glyphs.ts).
 *
 * Pure apart from the element shape: it reads React elements, imports nothing from React.
 */

export interface TextRun { text: string; family: string; weight: number; style: string }

interface Inherited { family: string; weight: number; style: string }

type Node = unknown;
interface ElementLike { type: unknown; props: Record<string, unknown> }

const isElement = (node: Node): node is ElementLike =>
  typeof node === "object" && node !== null && "type" in node && "props" in node;

function childrenOf(props: Record<string, unknown>): Node[] {
  const c = props.children;
  if (c === undefined || c === null || c === false) return [];
  return (Array.isArray(c) ? c.flat(Infinity) : [c]).filter((x) => x !== null && x !== undefined && x !== false && x !== "");
}

/** Walks the tree once: the rule problems, and every text run with the font it is set in. */
export function inspectTree(root: Node, base: Inherited): { problems: string[]; runs: TextRun[] } {
  const problems: string[] = [];
  const runs: TextRun[] = [];
  function walk(node: Node, path: string, inh: Inherited): void {
    if (typeof node === "string" || typeof node === "number") {
      runs.push({ text: String(node), ...inh });
      return;
    }
    if (Array.isArray(node)) { node.forEach((n, i) => walk(n, `${path}[${i}]`, inh)); return; }
    if (!isElement(node)) return;
    if (typeof node.type !== "string") {
      problems.push(`${path}: a component (${(node.type as { name?: string })?.name ?? "anonymous"}) in the tree; call it as a function so the slide can be checked`);
      return;
    }
    const here = `${path}/${node.type}`;
    const props = node.props;
    if ("className" in props || "tw" in props) problems.push(`${here}: className or tw; Satori slides use inline styles only`);
    if (node.type === "svg") {
      if (typeof props.width !== "number" || typeof props.height !== "number") problems.push(`${here}: an svg needs numeric width and height`);
      return; // svg internals are drawn by resvg, not laid out by Satori
    }
    const style = (props.style ?? {}) as Record<string, unknown>;
    const kids = childrenOf(props);
    if (kids.length > 0 && style.display !== "flex" && style.display !== "none") {
      problems.push(`${here}: has children but no display: flex`);
    }
    const next: Inherited = {
      family: typeof style.fontFamily === "string" ? style.fontFamily : inh.family,
      weight: typeof style.fontWeight === "number" ? style.fontWeight : inh.weight,
      style: typeof style.fontStyle === "string" ? style.fontStyle : inh.style,
    };
    kids.forEach((k, i) => walk(k, `${here}[${i}]`, next));
  }
  walk(root, "", base);
  return { problems, runs };
}

/** All the words a slide shows, in tree order. */
export function slideText(root: Node, base: Inherited): string {
  return inspectTree(root, base).runs.map((r) => r.text).join(" ");
}
