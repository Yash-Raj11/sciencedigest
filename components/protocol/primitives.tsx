"use client";

/**
 * Shared building blocks for every protocol widget. Per-paper widgets compose
 * these; they do not re-implement ticking, progress or grading.
 */

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import type { Choice } from "@/lib/content/types";
import { GRADE_NAME, weightLabel, type EvidenceGrade } from "@/lib/evidence";
import type { Protocol, ProtocolRow } from "@/lib/protocol/useProtocol";

const PIPS: Record<EvidenceGrade, number> = { high: 3, moderate: 2, low: 1, none: 0 };
const SHORT: Record<EvidenceGrade, string> = { high: "High", moderate: "Moderate", low: "Low", none: "No weight" };

/** "High ×1.0" with three pips. The pips carry the grade without relying on colour. */
export function GradeChip({ grade, className = "" }: { grade: EvidenceGrade; className?: string }) {
  return (
    <span
      title={`${GRADE_NAME[grade]}: counts ${weightLabel(grade)} toward the weighted score`}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-muted ${className}`}
    >
      <span aria-hidden className="flex gap-[2px]">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-2.5 w-1.5 rounded-[1px] ${i < PIPS[grade] ? "bg-accent" : "bg-line"}`} />
        ))}
      </span>
      <span>{SHORT[grade]} <span className="num">{weightLabel(grade)}</span></span>
    </span>
  );
}

/** Percentage of protocol completed, drawn as a ring. `pct` always comes from useProtocol. */
export function ProgressRing({ pct, size = 56, label }: { pct: number; size?: number; label: string }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${pct}%`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="butt"
          strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: "stroke-dashoffset 320ms cubic-bezier(0.2,0.8,0.2,1)" }}
        />
      </svg>
      <span className="figure absolute inset-0 flex items-center justify-center text-lg">{pct}<span className="text-[0.6em]">%</span></span>
    </div>
  );
}

export function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${checked ? "border-accent bg-accent text-accent-ink" : "border-muted/60 bg-transparent text-transparent"}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5 10 17 19 7" />
      </svg>
    </span>
  );
}

/** A tickable row. The whole row is the button. */
export function TickRow(props: { label: string; detail?: string | null; checked: boolean; onToggle: () => void; trailing?: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={props.checked}
      disabled={props.disabled}
      onClick={props.onToggle}
      className="flex w-full items-center gap-3 py-3 text-left disabled:opacity-60"
    >
      <CheckBox checked={props.checked} />
      <span className="min-w-0 flex-1">
        <span className={`block font-medium leading-snug ${props.checked ? "text-muted line-through decoration-1" : ""}`}>{props.label}</span>
        {props.detail && <span className="mt-0.5 block text-sm leading-snug text-muted">{props.detail}</span>}
      </span>
      {props.trailing}
    </button>
  );
}

/** A derived row: no checkbox, because it cannot be claimed by tapping. */
function DerivedRow(props: { met: boolean; label: string; status: string; trailing?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span
        aria-hidden
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${props.met ? "border-accent bg-accent text-accent-ink" : "border-dashed border-muted/60 text-transparent"}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5 10 17 19 7" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <span className="font-medium leading-snug">{props.label}</span>
          {props.trailing}
        </div>
        <p className="mt-0.5 text-sm leading-snug text-muted">
          <span className="sr-only">{props.met ? "Met. " : "Not met. "}</span>
          {props.status}
        </p>
        {props.children}
      </div>
    </div>
  );
}

function Source({ text }: { text: string | null }) {
  if (!text) return null;
  return <p className="num mt-1 text-xs leading-snug text-muted">From the paper: {text}</p>;
}

function WeekPips({ count, target }: { count: number; target: number }) {
  return (
    <span aria-hidden className="mt-1.5 flex gap-1">
      {Array.from({ length: Math.max(target, count) }, (_, i) => (
        <span key={i} className={`h-2 w-5 rounded-sm ${i < count ? "bg-accent" : "bg-line"}`} />
      ))}
    </span>
  );
}

function conditionStatus(row: ProtocolRow, protocol: Protocol): string {
  const { step } = row;
  if (step.conditionKey === "block_weeks_gte") {
    const needed = Number(step.conditionValue?.weeks) * 7;
    if (row.blockDay === null) return "Set a block start date below to begin counting.";
    return row.satisfied ? `Day ${row.blockDay} of your block. Needed: day ${needed}.` : `Day ${row.blockDay} of ${needed}.`;
  }
  const wanted = String(step.conditionValue?.modality ?? "");
  const choice = protocol.choices.find((c) => c.key === "modality");
  const name = (value: string | undefined) => choice?.options.find((o) => o.value === value)?.label.toLowerCase() ?? value ?? "not set";
  return row.satisfied ? `Your setting: ${name(wanted)}.` : `Your setting is ${name(protocol.state.choices.modality)}; this needs ${name(wanted)}.`;
}

export function ProtocolRows({ protocol, interactive }: { protocol: Protocol; interactive: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {protocol.rows.map((row) => {
        const { step } = row;
        if (row.role === "box" || row.role === "log") {
          return (
            <li key={step.id}>
              {interactive ? (
                <TickRow
                  label={step.label} detail={step.detail} checked={row.tickedToday}
                  onToggle={() => protocol.toggle(step.id)}
                  trailing={row.role === "box" ? <GradeChip grade={step.grade} /> : undefined}
                />
              ) : (
                <div className="flex items-start gap-3 py-3">
                  <span aria-hidden className="mt-0.5 h-7 w-7 shrink-0 rounded-md border-2 border-muted/60" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-snug">{step.label}</span>
                    {step.detail && <span className="mt-0.5 block text-sm leading-snug text-muted">{step.detail}</span>}
                  </span>
                  {row.role === "box" && <GradeChip grade={step.grade} />}
                </div>
              )}
              {row.role === "box" && step.sourceEstimate && <div className="-mt-1 pb-3 pl-10"><Source text={step.sourceEstimate} /></div>}
            </li>
          );
        }
        if (row.role === "target") {
          const target = step.targetPerWeek ?? 0;
          const count = row.weekCount ?? 0;
          return (
            <li key={step.id}>
              <DerivedRow
                met={row.satisfied} label={step.label} trailing={<GradeChip grade={step.grade} />}
                status={interactive ? `${count} of ${target} logged this week${step.detail ? `. ${step.detail}` : ""}` : (step.detail ?? "Counted from your session log.")}
              >
                {interactive && <WeekPips count={count} target={target} />}
                <Source text={step.sourceEstimate} />
              </DerivedRow>
            </li>
          );
        }
        return (
          <li key={step.id}>
            <DerivedRow
              met={interactive && row.satisfied} label={step.label} trailing={<GradeChip grade={step.grade} />}
              status={interactive ? conditionStatus(row, protocol) : (step.detail ?? "Worked out from your programme settings.")}
            >
              <Source text={step.sourceEstimate} />
            </DerivedRow>
          </li>
        );
      })}
    </ul>
  );
}

export function ChoicePicker({ choices, values, onChange }: { choices: Choice[]; values: Record<string, string>; onChange: (key: string, value: string | null) => void }) {
  const base = useId();
  if (choices.length === 0) return null;
  return (
    <div className="space-y-3">
      {choices.map((choice) => {
        if (choice.kind === "toggle") {
          const on = values[choice.key] === choice.options[0].value;
          return (
            <button
              key={choice.key} type="button" role="switch" aria-checked={on}
              onClick={() => onChange(choice.key, on ? null : choice.options[0].value)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span>
                <span className="block font-medium leading-snug">{choice.label}</span>
                {choice.help && <span className="block text-sm leading-snug text-muted">{choice.help}</span>}
              </span>
              <span aria-hidden className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-line"}`}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-bg transition-[left] ${on ? "left-6" : "left-1"}`} />
              </span>
            </button>
          );
        }
        return (
          <fieldset key={choice.key}>
            <legend className="font-medium leading-snug">{choice.label}</legend>
            {choice.help && <p className="text-sm leading-snug text-muted">{choice.help}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {choice.options.map((option) => {
                const selected = values[choice.key] === option.value;
                return (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${selected ? "border-accent bg-accent text-accent-ink" : "border-line text-ink"}`}
                  >
                    <input
                      type="radio" name={`${base}-${choice.key}`} className="sr-only" checked={selected}
                      onChange={() => onChange(choice.key, option.value)}
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

function BlockStart({ protocol }: { protocol: Protocol }) {
  const started = protocol.state.blockStartedAt;
  return (
    <div className="flex items-center justify-between gap-3">
      <span>
        <span className="block font-medium leading-snug">Training block</span>
        <span className="block text-sm leading-snug text-muted">
          {started ? `Started ${new Date(`${started}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}.` : "Not started. Set once; the weeks count themselves."}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <input
          type="date" aria-label="Block start date" value={started ?? ""} max={protocol.today}
          onChange={(e) => protocol.startBlock(e.target.value || null)}
          className="h-9 rounded-md border border-line bg-bg px-2 text-sm text-ink"
        />
        {!started && (
          <button type="button" onClick={() => protocol.startBlock(protocol.today)} className="h-9 rounded-md bg-accent px-3 text-sm font-bold text-accent-ink">
            Start today
          </button>
        )}
      </span>
    </div>
  );
}

export function Notice({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "warn" }) {
  return (
    <div className={`rounded-lg border px-3.5 py-3 text-sm leading-snug ${tone === "warn" ? "border-accent bg-accent-soft text-ink" : "border-line bg-surface text-ink"}`}>
      {children}
    </div>
  );
}

/**
 * The whole widget for one protocol. `variant="article"` sits under a paper's
 * simulator; `variant="card"` is the same protocol on the Today screen.
 */
export function ProtocolPanel({ protocol, variant, title, intro }: { protocol: Protocol; variant: "article" | "card"; title: string; intro?: ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { paper } = protocol;
  const interactive = protocol.equipped && !protocol.dormant;
  const hasSettings = protocol.choices.length > 0 || paper.hasBlock;
  const showSettings = hasSettings && (variant === "article" || settingsOpen || (paper.hasBlock && !protocol.state.blockStartedAt));

  return (
    <section aria-label={title} className="rounded-2xl border border-line bg-surface p-4">
      <header className="flex items-center gap-3.5">
        <ProgressRing pct={interactive ? protocol.progress.pct : 0} label="Protocol completed" />
        <div className="min-w-0 flex-1">
          <h3 className="display text-xl">{title}</h3>
          <p className="num text-sm text-muted">
            {!protocol.hydrated ? " "
              : protocol.dormant ? "Paused: untouched for over a week"
              : protocol.equipped ? `${protocol.progress.done} of ${protocol.progress.total} in place`
              : `${protocol.progress.total} ${protocol.progress.total === 1 ? "requirement" : "requirements"}`}
          </p>
        </div>
        {variant === "card" && hasSettings && interactive && (
          <button type="button" onClick={() => setSettingsOpen((v) => !v)} aria-expanded={showSettings} className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold">
            Settings
          </button>
        )}
      </header>

      {intro && variant === "article" && <div className="mt-3 text-sm leading-relaxed text-muted">{intro}</div>}

      {protocol.dormant ? (
        <div className="mt-4 space-y-3">
          <Notice>A protocol left alone for more than seven days stops counting against your score. Nothing is lost: your history is kept.</Notice>
          <div className="flex gap-2">
            <button type="button" onClick={protocol.equip} className="h-11 flex-1 rounded-lg bg-accent font-bold text-accent-ink">Resume</button>
            <button type="button" onClick={protocol.unequip} className="h-11 rounded-lg border border-line px-4 font-semibold">Remove</button>
          </div>
        </div>
      ) : (
        <>
          {protocol.conflict && interactive && (
            <div className="mt-4">
              <Notice tone="warn">
                <strong>These tracks pull in different directions.</strong> One asks for cycling, the other for overground running, and a session cannot be both. With both switched on, this protocol cannot reach 100%.
              </Notice>
            </div>
          )}

          {showSettings && (interactive || variant === "article") && (
            <div className="mt-4 space-y-4 rounded-xl border border-line bg-bg p-3.5">
              <ChoicePicker choices={protocol.choices} values={protocol.state.choices} onChange={protocol.equipped ? protocol.setChoice : () => {}} />
              {paper.hasBlock && protocol.equipped && <BlockStart protocol={protocol} />}
              {!protocol.equipped && protocol.choices.length > 0 && <p className="text-xs text-muted">Add the protocol to change these.</p>}
            </div>
          )}

          <div className="mt-2">
            {protocol.rows.length > 0
              ? <ProtocolRows protocol={protocol} interactive={interactive} />
              : <p className="py-4 text-sm text-muted">Switch on a track in Settings to see its requirements.</p>}
          </div>

          <footer className="mt-2 flex items-center gap-2">
            {!protocol.hydrated ? (
              <span className="h-11 flex-1 rounded-lg bg-line/60" />
            ) : protocol.equipped ? (
              <>
                {variant === "card"
                  ? <Link href={`/papers/${paper.slug}`} className="flex h-10 flex-1 items-center justify-center rounded-lg border border-line text-sm font-semibold">Read the paper</Link>
                  : <Link href="/today" className="flex h-11 flex-1 items-center justify-center rounded-lg border border-line font-semibold">Open Life Game</Link>}
                <button type="button" onClick={protocol.unequip} className={`${variant === "card" ? "h-10 text-sm" : "h-11"} rounded-lg px-3 font-semibold text-muted`}>Remove</button>
              </>
            ) : protocol.locked ? (
              <Link href="/upgrade" className="flex h-11 flex-1 items-center justify-center rounded-lg border border-accent font-bold text-accent-text">Members only: see what membership adds</Link>
            ) : (
              <button type="button" onClick={protocol.equip} className="h-12 flex-1 rounded-lg bg-accent text-base font-bold text-accent-ink">
                Add to Life Game
              </button>
            )}
          </footer>
        </>
      )}
    </section>
  );
}
