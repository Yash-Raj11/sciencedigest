/**
 * The doorbell: the authors' explanation, step by step. No hormone was
 * measured, so every arrow is dashed. Only the last box is filled: lower blood
 * glucose is the one thing in this chain the trial recorded.
 */

import { Figure } from "@/components/figures/Figure";
import { Flow, type FlowNode } from "@/components/figures/primitives";
import type { Evidence } from "@/components/figures/shared";
import type { FigureProps } from "../../registry";

interface Params { nodes: FlowNode[]; links: Evidence[] }

export default function Doorbell({ params, alt }: FigureProps) {
  const p = params as unknown as Params;
  return (
    <Figure title="The doorbell: how the authors think pepper acts" desc={alt} height={272}>
      <Flow x={30} y={8} width={260} nodes={p.nodes} links={p.links} />
    </Figure>
  );
}
