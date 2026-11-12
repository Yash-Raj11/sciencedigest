"use client";

/**
 * Set your own wake time, last caffeine and bedtime, and see whether your day
 * sits inside the timing this trial actually tested.
 *
 * It draws no caffeine-level curve: the paper's text gives none, so there is
 * nothing honest to draw. Inside the tested window it shows what the sleep
 * lab recorded; outside it, it says the trial is silent.
 */

import { useState } from "react";
import { GradeChip, Notice } from "@/components/protocol/primitives";
import type { ResolvedFact } from "@/lib/content/types";
import type { SimulatorProps } from "../registry";

interface Num { n: number; ref: string }
interface Params {
  doseMinutes: Num[];
  doseMg: Num;
  testedGapHours: Num;
  findings: ResolvedFact[];
  outside: ResolvedFact;
  caveat: ResolvedFact;
}

const toMinutes = (time: string) => { const [h, m] = time.split(":").map(Number); return h * 60 + m; };
const clock = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const span = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

function TimeField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-3 px-3.5 py-2">
      <span className="font-medium leading-snug">{label}</span>
      <input
        id={id} type="time" value={value} onChange={(e) => e.target.value && onChange(e.target.value)}
        className="num h-10 w-36 rounded-lg border border-line bg-surface px-2 text-base text-ink"
      />
    </label>
  );
}

export default function Simulator({ params }: SimulatorProps) {
  const p = params as unknown as Params;
  const [wake, setWake] = useState("07:00");
  const [last, setLast] = useState("16:30");
  const [bed, setBed] = useState("23:00");

  const wakeAt = toMinutes(wake);
  let bedAt = toMinutes(bed);
  if (bedAt <= wakeAt) bedAt += 1440;
  let lastAt = toMinutes(last);
  if (lastAt < wakeAt) lastAt += 1440;
  const afterBed = lastAt > bedAt;

  const gap = Math.max(0, bedAt - lastAt);
  const tested = p.testedGapHours.n * 60;
  const inside = !afterBed && gap >= tested;
  const day = bedAt - wakeAt;
  const at = (minute: number) => `${Math.min(100, Math.max(0, ((minute - wakeAt) / day) * 100))}%`;
  const cutoff = bedAt - tested;

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-4">
      <div className="divide-y divide-line rounded-xl border border-line bg-bg">
        <TimeField id="caf-wake" label="I wake at" value={wake} onChange={setWake} />
        <TimeField id="caf-last" label="My last caffeine" value={last} onChange={setLast} />
        <TimeField id="caf-bed" label="I go to bed at" value={bed} onChange={setBed} />
      </div>

      <div className="rounded-xl border border-line bg-bg p-3.5">
        <p className="text-sm leading-snug text-muted">
          Your day, with the trial&apos;s three {p.doseMg.n} mg doses placed after your wake time.
        </p>
        <div className="relative mt-9 h-10" role="img" aria-label={`Your last caffeine is ${span(gap)} before bed. The trial tested ${p.testedGapHours.n} hours.`}>
          <span aria-hidden className="absolute inset-0 rounded-md bg-line/60" />
          {cutoff > wakeAt && (
            <span
              aria-hidden
              className="absolute inset-y-0 right-0 rounded-r-md border-l-2 border-dashed border-ink bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--line)_6px_8px)]"
              style={{ left: at(cutoff) }}
            />
          )}
          {p.doseMinutes.map((dose, i) => (
            <span key={i} aria-hidden className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg bg-muted" style={{ left: at(wakeAt + dose.n) }} />
          ))}
          <span aria-hidden className="absolute -top-8 bottom-0 flex -translate-x-1/2 flex-col items-center" style={{ left: at(Math.min(lastAt, bedAt)), transition: "left 200ms" }}>
            <span className={`num whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-bold ${inside ? "bg-accent text-accent-ink" : "bg-ink text-bg"}`}>you {clock(lastAt)}</span>
            <span className={`w-1 flex-1 ${inside ? "bg-accent" : "bg-ink"}`} />
          </span>
        </div>
        <p className="num mt-1.5 flex justify-between text-xs text-muted" aria-hidden>
          <span>wake {clock(wakeAt)}</span>
          <span>bed {clock(bedAt)}</span>
        </p>
        <ul className="mt-3 space-y-1 text-xs text-muted">
          <li className="flex items-center gap-2"><span aria-hidden className="h-3 w-3 rounded-full bg-muted" />The trial&apos;s dose times</li>
          <li className="flex items-center gap-2"><span aria-hidden className="h-3 w-5 border-l-2 border-dashed border-ink bg-[repeating-linear-gradient(135deg,transparent_0_4px,var(--line)_4px_6px)]" />Final {p.testedGapHours.n} hours before bed: not tested</li>
        </ul>
      </div>

      {inside ? (
        <>
          <Notice>
            <strong className="num">Your last caffeine is {span(gap)} before bed.</strong> That is at or beyond the {p.testedGapHours.n} hours this trial tested. On that schedule the sleep lab recorded:
          </Notice>
          <ul className="divide-y divide-line rounded-xl border border-line bg-bg">
            {p.findings.map((fact) => (
              <li key={fact.id} className="px-3.5 py-3">
                <p className="flex items-start justify-between gap-3">
                  <span className="min-w-0 font-medium leading-snug">{fact.finding?.outcome ?? fact.label}</span>
                  {fact.finding && <GradeChip grade={fact.finding.tier} />}
                </p>
                <p className="mt-0.5 text-sm leading-snug text-muted">{fact.label.charAt(0).toUpperCase() + fact.label.slice(1)}.</p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <Notice tone="warn">
          <strong className="num">
            {afterBed ? "That is after your bedtime." : `Your last caffeine is ${span(gap)} before bed.`}
          </strong>{" "}
          The trial tested a gap of {p.testedGapHours.n} hours and nothing shorter, so its result does not cover your timing. {p.outside.label}:
          <span className="mt-1.5 block font-serif italic text-muted">&ldquo;{p.outside.quote}&rdquo;</span>
        </Notice>
      )}

      <p className="text-sm leading-snug text-muted">
        {p.caveat.label}. The trial was run in people who take caffeine every day.
      </p>
    </div>
  );
}
