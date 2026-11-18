/**
 * The lock and the placeholder key. The paper states how caffeine acts and
 * what the authors expected of it; neither was measured here, so both are
 * drawn outlined. What the sleep laboratory recorded is the one filled shape.
 */

import { Figure } from "@/components/figures/Figure";
import { Cell, Flow, Label, LockKey } from "@/components/figures/primitives";
import type { Evidence } from "@/components/figures/shared";
import type { FigureProps } from "../../registry";

interface Params { lock: Evidence; expected: Evidence; found: Evidence }

export default function LockAndKey({ params, alt }: FigureProps) {
  const p = params as unknown as Params;
  return (
    <Figure title="A lock, its own key and a blank key" desc={alt} height={332}>
      <Cell x={8} y={6} width={304} height={204} label="In the nervous system" />
      <LockKey x={28} y={34} keyIn="real" kind={p.lock.kind} fact={p.lock.fact} />
      <Label x={128} y={66} lines={["Adenosine, the body's own", "key, fits the sleepiness lock."]} />
      <LockKey x={28} y={112} keyIn="placeholder" shutOut kind={p.lock.kind} fact={p.lock.fact} />
      <Label x={28} y={184} lines={["Caffeine is a blank key: it sits in the lock", "and keeps the real key out."]} />
      <Flow
        x={8} y={222} width={304} gap={12}
        nodes={[
          { ...p.expected, lines: ["The authors expected lighter sleep"] },
          { ...p.found, lines: ["The sleep lab found no difference", "from placebo nights"] },
        ]}
      />
    </Figure>
  );
}
