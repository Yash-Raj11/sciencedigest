"use client";

/**
 * Everyday habits as small tiles that open into a full view.
 *
 *   check   tick it off              full view: a six-week grid of days
 *   target  reach a daily number     full view: this week's bars against the target
 *   count   log each one             full view: today's count, pips, the week
 *
 * A tile shows today and offers the one tap that matters. The full view shows
 * history, which is read from what is already on the device: opening it costs
 * no request.
 */

import { useState } from "react";
import { Sheet } from "@/components/shell/Sheet";
import { addDays } from "@/lib/dates";
import { useStore } from "@/lib/store";
import type { Game } from "@/lib/store/game";
import { MAX_HABITS, neededFor, type Habit, type HabitKind } from "@/lib/store/reduce";

const STARTERS: { label: string; kind: HabitKind; unit?: string; target?: number; note: string }[] = [
  { label: "Drink 3 L of water", kind: "target", unit: "glasses", target: 12, note: "12 glasses of 250 ml" },
  { label: "Ten minutes outside before noon", kind: "check", note: "tick it off" },
  { label: "Read a little", kind: "target", unit: "pages", target: 20, note: "20 pages a day" },
];

const KIND_NAME: Record<HabitKind, string> = { check: "Tick it off", target: "Reach a daily number", count: "Count each one" };

/** How much one tap adds: small numbers go up by 1, large ones in sensible jumps. */
function tapSize(habit: Habit): number {
  const t = habit.target ?? 0;
  return t >= 1000 ? 250 : t >= 100 ? 10 : t >= 20 ? 5 : 1;
}

function daysBack(today: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(today, i - count + 1));
}

const letter = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "narrow" });

function useHabitDay(habit: Habit, game: Game) {
  const amountOn = (date: string) => game.amounts[date]?.[habit.id] ?? 0;
  const doneOn = (date: string) => game.ticks.has(`${habit.id}|${date}`);
  return { amountOn, doneOn, amount: amountOn(game.today), done: doneOn(game.today) };
}

function Tile({ habit, game, onOpen }: { habit: Habit; game: Game; onOpen: () => void }) {
  const { toggleTick, setAmount } = useStore.getState();
  const day = useHabitDay(habit, game);
  const step = tapSize(habit);

  return (
    <li className={`flex flex-col rounded-2xl border p-3 ${day.done ? "border-accent bg-accent-soft" : "border-line bg-surface"}`}>
      <button type="button" onClick={onOpen} aria-label={`Open ${habit.label}`} className="flex min-h-[5.25rem] flex-1 flex-col text-left">
        <span className="line-clamp-2 font-semibold leading-snug">{habit.label}</span>
        <span className="mt-auto block pt-2">
          {habit.kind === "check" && (
            <span className="flex gap-1" aria-hidden>
              {daysBack(game.today, 7).map((date) => (
                <span key={date} className={`h-3 flex-1 rounded-sm ${day.doneOn(date) ? "bg-accent" : "bg-line"}`} />
              ))}
            </span>
          )}
          {habit.kind === "target" && (
            <>
              <span className="num block text-sm"><strong className="text-base">{day.amount}</strong> of {habit.target} {habit.unit}</span>
              <span className="mt-1 block h-2 rounded-full bg-line" aria-hidden>
                <span className="block h-2 rounded-full bg-accent" style={{ width: `${Math.min(100, (day.amount / neededFor(habit)) * 100)}%`, transition: "width 240ms" }} />
              </span>
            </>
          )}
          {habit.kind === "count" && (
            <span className="num flex items-baseline gap-1.5"><span className="figure text-[2rem]">{day.amount}</span><span className="text-sm text-muted">{habit.unit} today</span></span>
          )}
        </span>
      </button>

      {habit.kind === "check" ? (
        <button
          type="button" role="checkbox" aria-checked={day.done} aria-label={habit.label} onClick={() => toggleTick(habit.id, game.today)}
          className={`mt-2.5 h-10 rounded-lg text-sm font-bold ${day.done ? "bg-accent text-accent-ink" : "border border-line bg-bg"}`}
        >
          {day.done ? "Done" : "Tick"}
        </button>
      ) : (
        <button
          type="button" onClick={() => setAmount(habit.id, day.amount + step, game.today)}
          aria-label={`Add ${step} ${habit.unit} to ${habit.label}`}
          className="num mt-2.5 h-10 rounded-lg border border-line bg-bg text-sm font-bold"
        >
          + {step} {step === 1 && habit.kind === "count" ? "" : habit.unit}
        </button>
      )}
    </li>
  );
}

function WeekBars({ habit, game }: { habit: Habit; game: Game }) {
  const day = useHabitDay(habit, game);
  const week = daysBack(game.today, 7);
  const top = Math.max(habit.target ?? 1, ...week.map(day.amountOn));
  return (
    <div>
      <ol className="relative flex h-32 items-end gap-2" aria-label="The last seven days">
        {habit.target && (
          <li aria-hidden className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-muted/60" style={{ bottom: `${(habit.target / top) * 100}%` }} />
        )}
        {week.map((date) => {
          const amount = day.amountOn(date);
          return (
            <li key={date} className="flex h-full min-w-0 flex-1 flex-col justify-end" aria-label={`${date}: ${amount} ${habit.unit}`}>
              <span
                className={`block rounded-t-md ${day.doneOn(date) && habit.target ? "bg-accent" : amount > 0 ? "bg-accent/45" : "bg-line"}`}
                style={{ height: `${Math.max(3, (amount / top) * 100)}%`, transition: "height 240ms" }}
              />
            </li>
          );
        })}
      </ol>
      <ol className="mt-1 flex gap-2 text-center text-xs text-muted" aria-hidden>
        {week.map((date) => <li key={date} className={`min-w-0 flex-1 ${date === game.today ? "font-bold text-ink" : ""}`}>{letter(date)}</li>)}
      </ol>
      {habit.target && <p className="mt-1 text-xs text-muted">Dashed line: your target of {habit.target} {habit.unit}.</p>}
    </div>
  );
}

function Detail({ habit, game, onRemoved }: { habit: Habit; game: Game; onRemoved: () => void }) {
  const { toggleTick, setAmount, retireHabit } = useStore.getState();
  const day = useHabitDay(habit, game);
  const [confirming, setConfirming] = useState(false);
  const step = tapSize(habit);
  const sixWeeks = daysBack(game.today, 42);
  const week = daysBack(game.today, 7);
  const yesterday = day.amountOn(addDays(game.today, -1));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{KIND_NAME[habit.kind]}. Your own habit: it counts toward consistency and your streak, and carries no evidence weight.</p>

      {habit.kind === "check" && (
        <>
          <button
            type="button" role="checkbox" aria-checked={day.done} onClick={() => toggleTick(habit.id, game.today)}
            className={`h-14 w-full rounded-xl text-lg font-bold ${day.done ? "bg-accent text-accent-ink" : "border-2 border-line bg-surface"}`}
          >
            {day.done ? "Done today" : "Tick today"}
          </button>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <ol className="grid grid-cols-14 gap-1" aria-label="The last six weeks, oldest first">
              {sixWeeks.map((date) => (
                <li key={date} aria-label={`${date}: ${day.doneOn(date) ? "done" : "not done"}`}
                  className={`aspect-square rounded-[3px] ${day.doneOn(date) ? "bg-accent" : "bg-line"} ${date === game.today ? "outline outline-2 outline-offset-1 outline-ink" : ""}`} />
              ))}
            </ol>
            <p className="num mt-3 text-sm">Done on <strong>{sixWeeks.filter(day.doneOn).length} of the last 42 days</strong>. Every square is a day; today is outlined.</p>
          </div>
        </>
      )}

      {habit.kind !== "check" && (
        <>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="num flex items-baseline gap-2">
              <span className="figure text-[3.5rem]">{day.amount}</span>
              <span className="text-muted">{habit.target ? `of ${habit.target} ${habit.unit} today` : `${habit.unit} today`}</span>
            </p>
            {habit.kind === "count" && (
              <ol className="mt-2 flex flex-wrap gap-1.5" aria-hidden>
                {Array.from({ length: Math.max(8, Math.min(day.amount, 24)) }, (_, i) => (
                  <li key={i} className={`h-5 w-4 rounded-b-full rounded-t-[40%] ${i < day.amount ? "bg-accent" : "border-2 border-line"}`} />
                ))}
              </ol>
            )}
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={day.amount === 0} onClick={() => setAmount(habit.id, day.amount - step, game.today)} aria-label={`Take away ${step}`} className="num h-12 w-16 rounded-xl border border-line bg-bg text-lg font-bold disabled:opacity-30">− {step}</button>
              <button type="button" onClick={() => setAmount(habit.id, day.amount + step, game.today)} className="num h-12 flex-1 rounded-xl bg-accent text-lg font-bold text-accent-ink">+ {step} {habit.unit}</button>
            </div>
            <label className="mt-3 flex items-center justify-between gap-3 text-sm">
              <span className="text-muted">Or set today&apos;s number</span>
              <input
                type="number" inputMode="numeric" min={0} max={100000} value={day.amount}
                onChange={(e) => setAmount(habit.id, Number(e.target.value) || 0, game.today)}
                className="num h-10 w-28 rounded-lg border border-line bg-bg px-2 text-right text-base text-ink"
              />
            </label>
            <p className="num mt-3 text-sm leading-snug text-muted" aria-live="polite">
              {habit.target
                ? `At target on ${week.filter(day.doneOn).length} of the last 7 days.`
                : yesterday === 0 ? "Nothing logged yesterday." : day.amount > yesterday ? `${day.amount - yesterday} more than yesterday.` : day.amount === yesterday ? "The same as yesterday." : `Yesterday you logged ${yesterday}.`}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4"><WeekBars habit={habit} game={game} /></div>
        </>
      )}

      <button
        type="button"
        onClick={() => { if (confirming) { retireHabit(habit.id); onRemoved(); } else setConfirming(true); }}
        className={`h-11 w-full rounded-lg border text-sm font-semibold ${confirming ? "border-accent text-accent-text" : "border-line text-muted"}`}
      >
        {confirming ? "Tap again to remove. Your past days are kept." : "Remove this habit"}
      </button>
    </div>
  );
}

function AddHabit({ full, onAdded }: { full: boolean; onAdded: () => void }) {
  const { addHabit } = useStore.getState();
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<HabitKind>("check");
  const [unit, setUnit] = useState("");
  const [target, setTarget] = useState("");
  const ready = label.trim().length > 0 && (kind === "check" || unit.trim().length > 0) && (kind !== "target" || Number(target) >= 1);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready && addHabit(label, { kind, unit, target: Number(target) })) onAdded();
      }}
    >
      <label className="block">
        <span className="block text-sm font-semibold">What is the habit?</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} placeholder="Stretch after waking" autoFocus
          className="mt-1 h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink placeholder:text-muted" />
      </label>

      <fieldset>
        <legend className="text-sm font-semibold">How do you want to track it?</legend>
        <div className="mt-1 divide-y divide-line rounded-xl border border-line bg-surface">
          {([
            ["check", "A walk, a stretch. One tap marks the day."],
            ["target", "Pages, minutes, glasses. Done when you reach your number."],
            ["count", "Log each one as it happens. No target."],
          ] as const).map(([value, help]) => (
            <label key={value} className="flex cursor-pointer items-start gap-3 px-3.5 py-3">
              <input type="radio" name="habit-kind" checked={kind === value} onChange={() => setKind(value)} className="mt-1 h-5 w-5 accent-[var(--accent)]" />
              <span><span className="block font-semibold leading-snug">{KIND_NAME[value]}</span><span className="block text-sm leading-snug text-muted">{help}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      {kind !== "check" && (
        <div className="flex gap-2">
          {kind === "target" && (
            <label className="block w-28">
              <span className="block text-sm font-semibold">Daily number</span>
              <input type="number" inputMode="numeric" min={1} max={100000} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="20"
                className="num mt-1 h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink placeholder:text-muted" />
            </label>
          )}
          <label className="block min-w-0 flex-1">
            <span className="block text-sm font-semibold">Counted in</span>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={20} placeholder={kind === "target" ? "pages" : "glasses"}
              className="mt-1 h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink placeholder:text-muted" />
          </label>
        </div>
      )}

      {kind !== "check" && <p className="text-sm leading-snug text-muted">The way a habit is tracked is fixed once it is made, so your old days always mean the same thing.</p>}

      <button type="submit" disabled={!ready || full} className="h-12 w-full rounded-xl bg-accent text-lg font-bold text-accent-ink disabled:opacity-40">
        {full ? "Habit limit reached" : "Add habit"}
      </button>
    </form>
  );
}

export function HabitTiles({ game, ready }: { game: Game; ready: boolean }) {
  const { addHabit } = useStore.getState();
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const open = game.habits.find((h) => h.id === openId) ?? null;
  const have = new Set(game.habits.map((h) => h.label.toLowerCase()));
  const starters = STARTERS.filter((s) => !have.has(s.label.toLowerCase()));
  const full = game.habits.length >= MAX_HABITS;

  return (
    <section aria-label="Everyday habits">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="display text-xl">Everyday</h2>
        <button type="button" onClick={() => setAdding(true)} className="text-sm font-semibold text-accent-text underline underline-offset-4">Add a habit</button>
      </header>

      {ready && game.habits.length > 0 && (
        <ul className="mt-2 grid grid-cols-2 gap-2.5">
          {game.habits.map((habit) => <Tile key={habit.id} habit={habit} game={game} onOpen={() => setOpenId(habit.id)} />)}
        </ul>
      )}

      {ready && game.habits.length < 3 && starters.length > 0 && (
        <div className="mt-2 rounded-2xl border border-dashed border-line p-3.5">
          <p className="text-sm font-semibold">{game.habits.length === 0 ? "Start with the basics" : "More basics"}</p>
          <ul className="mt-2 space-y-2">
            {starters.map((s) => (
              <li key={s.label}>
                <button type="button" onClick={() => addHabit(s.label, { kind: s.kind, unit: s.unit, target: s.target })}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left">
                  <span><span className="block font-semibold leading-snug">{s.label}</span><span className="block text-sm text-muted">{s.note}</span></span>
                  <span aria-hidden className="text-xl font-bold text-accent-text">+</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Sheet open={open !== null} onClose={() => setOpenId(null)} title={open?.label ?? ""}>
        {open && <Detail key={open.id} habit={open} game={game} onRemoved={() => setOpenId(null)} />}
      </Sheet>
      <Sheet open={adding} onClose={() => setAdding(false)} title="New habit">
        <AddHabit full={full} onAdded={() => setAdding(false)} />
      </Sheet>
    </section>
  );
}
