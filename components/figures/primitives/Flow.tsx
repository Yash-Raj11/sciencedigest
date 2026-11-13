import { assertEvidence } from "@/lib/content/figures";
import { ACCENT, BG, INK, strokeOf, type Evidence } from "../shared";
import { Arrow } from "./Arrow";
import { Label } from "./Label";

export interface FlowNode extends Evidence { lines: string[] }

/**
 * A chain of steps, top to bottom. A measured step is a filled box; a proposed
 * one is a dashed outline. `links[i]` joins step i to step i + 1 and carries its
 * own evidence, so a chain can end in something measured and still be joined
 * by arrows nobody tested. Leave a link out and the two steps are not joined.
 */
export function Flow({ x, y, width, nodeHeight = 44, gap = 26, nodes, links = [] }: {
  x: number; y: number; width: number; nodeHeight?: number; gap?: number; nodes: FlowNode[]; links?: (Evidence | null)[];
}) {
  const top = (i: number) => y + i * (nodeHeight + gap);
  return (
    <g>
      {nodes.map((node, i) => {
        assertEvidence(node.kind, node.fact);
        const measured = node.kind === "measured";
        const firstLine = top(i) + nodeHeight / 2 + 4 - (node.lines.length - 1) * 7.5;
        return (
          <g key={i} data-evidence={node.kind} data-fact={node.fact.id}>
            <rect
              x={x} y={top(i)} width={width} height={nodeHeight} rx={10}
              fill={measured ? ACCENT : BG} stroke={measured ? ACCENT : INK} strokeWidth={1.5} {...strokeOf(node.kind)}
            />
            <Label x={x + width / 2} y={firstLine} anchor="middle" tone={measured ? "onAccent" : "ink"} bold={measured} lines={node.lines} />
          </g>
        );
      })}
      {links.map((link, i) => (link && i < nodes.length - 1 ? (
        <Arrow key={i} x1={x + width / 2} y1={top(i) + nodeHeight + 3} x2={x + width / 2} y2={top(i + 1) - 3} kind={link.kind} fact={link.fact} />
      ) : null))}
    </g>
  );
}
