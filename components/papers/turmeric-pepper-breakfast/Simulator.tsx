"use client";

/**
 * Pick one of the four breakfasts the trial served and see what it recorded
 * after that meal, next to the plain one.
 *
 * It draws no blood-glucose curve: the paper's text gives no glucose values,
 * only which meals differed and when, so there is nothing honest to draw.
 * The one thing printed as numbers, the taste scores, is drawn to scale.
 * Simulator kind: "breakfast-meals". Every row is a fact from the paper.
 */

import { useState } from "react";
import { GradeChip } from "@/components/protocol/primitives";
import type { ResolvedFact } from "@/lib/content/types";
import type { SimulatorProps } from "../registry";

interface Num { n: number; ref: string }
type Result = "reference" | "lower" | "same" | "none_reported";
interface Row { result: Result; fact: ResolvedFact | null }
interface Meal {
  id: string;
  label: string;
  /** What went into the egg, in words. */
  added: string;
  glucoseEarly: Row;
  glucoseTotal: Row;
  hunger: Row;
  gut: Row;
  taste: Num;
}
interface Params {
  participants: Num;
  earlyMinutes: Num;
  totalMinutes: Num;
  tasteMax: Num;
  meals: Meal[];
}

const WORDS: Record<Result, string> = {
  reference: "The comparison meal",
  lower: "Lower than the plain meal",
  same: "No clear difference",
  none_reported: "No change reported",
};

function Outcome({ name, row }: { name: string; row: Row }) {
  const changed = row.result === "lower";
  return (
    <li className="flex items-center gap-3 px-3.5 py-3">
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-snug text-muted">{name}</span>
        <span className={`block font-semibold leading-snug ${changed ? "text-accent-text" : "text-ink"}`}>{WORDS[row.result]}</span>
      </span>
      {row.fact?.finding && changed ? <GradeChip grade={row.fact.finding.tier} /> : null}
    </li>
  );
}

/** The taste score as a mark on the 1-to-max line the participants rated on. */
function TasteLine({ score, max, plain }: { score: number; max: number; plain: number }) {
  const x = (value: number) => 12 + ((value - 1) / (max - 1)) * 276;
  return (
    <svg viewBox="0 0 300 44" role="img" className="mt-2 w-full" aria-label={`Taste score ${score} out of ${max}. The plain meal scored ${plain}.`}>
      <line x1={12} x2={288} y1={18} y2={18} stroke="var(--line)" strokeWidth={4} strokeLinecap="round" />
      <line x1={x(plain)} x2={x(plain)} y1={8} y2={28} stroke="var(--muted)" strokeWidth={2} />
      <circle cx={x(score)} cy={18} r={7} fill="var(--accent)" />
      <text x={12} y={41} fontSize={11} fill="var(--muted)">1 dislike</text>
      <text x={288} y={41} fontSize={11} fill="var(--muted)" textAnchor="end">{max} like</text>
    </svg>
  );
}

export default function Simulator({ params }: SimulatorProps) {
  const p = params as unknown as Params;
  const meals = p.meals ?? [];
  const [chosen, setChosen] = useState(meals[1]?.id ?? meals[0]?.id);
  const meal = meals.find((m) => m.id === chosen) ?? meals[0];
  const plain = meals.find((m) => m.glucoseEarly.result === "reference") ?? meals[0];
  if (!meal) return <p className="text-sm text-muted">This paper&apos;s simulator has no meals to show.</p>;

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-4">
      <fieldset>
        <legend className="font-semibold">Pick a breakfast the trial served</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {meals.map((m) => (
            <label
              key={m.id}
              className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-2 py-2 text-center text-sm font-medium leading-snug ${
                m.id === meal.id ? "border-accent bg-bg text-accent-text" : "border-line bg-bg text-ink"
              }`}
            >
              <input type="radio" name="breakfast-meal" className="sr-only" checked={m.id === meal.id} onChange={() => setChosen(m.id)} />
              {m.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="rounded-xl border border-line bg-bg" aria-live="polite">
        <p className="border-b border-line px-3.5 py-3 text-sm leading-snug text-muted">{meal.added}</p>
        <ul className="divide-y divide-line">
          <Outcome name={`Blood glucose ${p.earlyMinutes.n} minutes after eating`} row={meal.glucoseEarly} />
          <Outcome name={`Blood glucose over the whole ${p.totalMinutes.n} minutes`} row={meal.glucoseTotal} />
          <Outcome name="Hunger, as the participants rated it" row={meal.hunger} />
          <Outcome name="Stomach and gut symptoms, as rated" row={meal.gut} />
        </ul>
        <div className="border-t border-line px-3.5 py-3">
          <p className="text-sm leading-snug text-muted">How much they liked it overall</p>
          <p className="font-semibold leading-snug"><span className="num">{meal.taste.n}</span> out of <span className="num">{p.tasteMax.n}</span></p>
          <TasteLine score={meal.taste.n} max={p.tasteMax.n} plain={plain.taste.n} />
          {meal.id !== plain.id ? <p className="mt-1 text-sm leading-snug text-muted">The grey mark is the plain meal.</p> : null}
        </div>
      </div>

      <p className="text-sm leading-snug text-muted">
        What <span className="num">{p.participants.n}</span> healthy adults showed after one breakfast each. The paper prints no
        glucose values, so no curve is drawn. This is not a forecast for you.
      </p>
      <p className="text-sm leading-snug text-muted">
        The authors&apos; own caution: the lower hunger might be because the spiced meals tasted worse.
      </p>
    </div>
  );
}
