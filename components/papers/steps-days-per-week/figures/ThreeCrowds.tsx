/**
 * FIGURE-DESIGN 3A, "three different crowds" (owner, 2026-11-15; R3: it sits in the audit, not
 * the mechanism). Why the raw gap looks so large: the three groups were different people before
 * anyone counted a step. Older, and more often unwell, in the group with no step days.
 *
 * An observational study, so nothing joins the columns: no arrow, no line. Everything shown is
 * printed in the paper (the groups' edges, mean ages, the share with a mobility limitation);
 * the drawn person is the same outline in every column and means nothing by its size. Bright
 * orange only on the three ages; no pastel, because the paper's key result is not in this figure.
 */

import { Figure } from "@/components/figures/Figure";
import { CROWDS_FRAME as F, ageWords, crowdColumns, mobilityLine, wrapLines } from "@/components/figures/crowds-layout";
import { thousands } from "@/components/figures/format";
import { groupLabel } from "@/components/figures/association-layout";
import { Label, Person, WeekStrip } from "@/components/figures/primitives";
import type { Evidence } from "@/components/figures/shared";
import { DESCRIPTIVE_LABEL, assertEvidence } from "@/lib/content/figures";
import type { FigureProps } from "../../registry";

interface Num { n: number; ref: string }
interface Group { from: Num; to: Num; age: Num; mobility: Num }
interface Params { threshold: Num; mobilityWords: string; groups: Group[]; ages: Evidence; mobility: Evidence }

export default function ThreeCrowds({ params, alt }: FigureProps) {
  const p = params as unknown as Params;
  const columns = crowdColumns(p.groups.length);
  // Measured at the start (descriptive facts): drawn solid, and labelled so.
  assertEvidence(p.ages.kind, p.ages.fact);
  assertEvidence(p.mobility.kind, p.mobility.fact);
  return (
    <Figure title="Who was in each group" desc={alt} height={F.height}>
      <Label x={F.left} y={F.span} tone="muted" size={F.size}>{`Days a week with ${thousands(p.threshold.n)} steps or more`}</Label>
      {p.groups.map((group, i) => {
        const c = columns[i];
        return (
          <g key={group.age.n} data-group>
            <Label x={c.mid} y={F.title} anchor="middle" size={F.size + 1} bold>{groupLabel(group)}</Label>
            <WeekStrip x={c.x + 6} y={F.strip} width={c.width - 12} from={group.from.n} to={group.to.n} />
            <Person x={c.mid} y={F.person} height={F.personHeight} />
            <g data-evidence={p.ages.kind} data-fact={p.ages.fact.id}>
              <Label x={c.mid} y={F.ageLabel} anchor="middle" tone="muted" size={F.size}>Average age</Label>
              <Label x={c.mid} y={F.age} anchor="middle" tone="signal" size={F.size + 4} bold>{ageWords(group.age.n)}</Label>
            </g>
            <g data-evidence={p.mobility.kind} data-fact={p.mobility.fact.id}>
              <Label x={c.mid} y={F.fact} anchor="middle" size={F.size} lines={wrapLines(mobilityLine(group.mobility.n, p.mobilityWords, !i))} />
            </g>
          </g>
        );
      })}
      <Label x={F.left} y={F.height - 6} tone="muted" size={F.size} >{`${DESCRIPTIVE_LABEL}: ages and trouble walking`}</Label>
    </Figure>
  );
}
