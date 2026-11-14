"use client";

/**
 * A simulator drawn by kind (docs/SIMULATORS.md): the read hands the kind its
 * resolved facts, the source line of each, and the sentences its editorial
 * wrote for it (alt text, a note on where a number comes from, the paper's
 * own finding to show beside the result). Each sentence keeps its dots, so a
 * reader can tap through to the passage.
 */

import type { GroupEdges } from "@/components/figures/association-layout";
import { AssociationCurve } from "@/components/figures/kinds/AssociationCurve";
import { Decay } from "@/components/figures/kinds/Decay";
import { FROM_THE_PAPER, factSourceLine } from "@/lib/content/source-line";
import type { PaperContent, ResolvedFact } from "@/lib/content/types";
import { Para } from "./parts";

const one = (value: ResolvedFact | ResolvedFact[] | undefined): ResolvedFact | undefined => (Array.isArray(value) ? undefined : value);

export function KindSimulator({ content, observational }: { content: PaperContent; observational: boolean }) {
  const { spec, words = {} } = content.simulator;
  if (!spec) return null;
  const { facts, context } = content;
  const say = (name: string, className: string) =>
    words[name] ? <Para sentences={words[name]} facts={facts} context={context} className={className} /> : null;
  const alt = (words.alt ?? []).map((s) => s.text).join(" ");

  if (spec.kind === "decay") {
    const halfLife = one(spec.simulator.halfLife) ?? one(spec.facts.halfLife);
    if (!halfLife) return null;
    return (
      <Decay
        mode="full" halfLife={halfLife} alt={alt} sourceLine={factSourceLine(halfLife, content)}
        note={say("halfLifeNote", "text-sm leading-snug text-muted")}
        beside={words.finding ? (
          <>
            <h3 className="text-sm font-medium text-muted">What this paper found</h3>
            {say("finding", "mt-1 text-base leading-snug")}
            <p className="mt-1.5 text-sm text-muted">{FROM_THE_PAPER}.</p>
          </>
        ) : null}
      />
    );
  }
  if (spec.kind === "association-curve") {
    const many = (value: ResolvedFact | ResolvedFact[] | undefined) => (Array.isArray(value) ? value : []);
    const raw = many(spec.simulator.raw);
    const groups = content.simulator.params.groups as GroupEdges[] | undefined;
    if (!groups) return null;
    // The first raw share's source line stands for all: every value of this kind is the paper's own.
    return (
      <AssociationCurve
        mode="full" raw={raw} adjusted={many(spec.simulator.adjusted)} groups={groups} alt={alt}
        sourceLine={raw[0] ? factSourceLine(raw[0], content) : FROM_THE_PAPER} observational={observational}
        ask={say("ask", "text-lg font-medium leading-snug")} headline={say("headline", "text-lg font-medium leading-snug")}
        who={say("who", "text-base leading-snug")}
      />
    );
  }
  return <p className="text-sm text-muted">This simulator is not available in this version of the app.</p>;
}
