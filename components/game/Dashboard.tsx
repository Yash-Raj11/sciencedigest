"use client";

import Link from "next/link";
import { useState } from "react";
import { LifeBar } from "./LifeBar";
import { WidgetFor } from "@/components/papers/registry";
import { Companion } from "./Companion";
import { DayComplete } from "./DayComplete";
import { HabitTiles } from "./HabitTiles";
import { Notice, ProgressRing } from "@/components/protocol/primitives";
import { Sheet } from "@/components/shell/Sheet";
import { papers } from "@/lib/content";
import { useStore } from "@/lib/store";
import { useGame, type Game } from "@/lib/store/game";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function ScoreCard({ game, hydrated }: { game: Game; hydrated: boolean }) {
  const [open, setOpen] = useState(false);
  const { result } = game;
  return (
    <section aria-label="Your score" className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="figure text-[4.5rem]">{hydrated ? result.pct : 0}<span className="text-[0.45em]">%</span></p>
          <p className="mt-2 text-sm font-semibold">Adherence, weighted by evidence</p>
        </div>
        <p className="num pb-1 text-right text-sm leading-snug text-muted">
          {result.earned.toFixed(1)} of {result.possible.toFixed(1)}<br />weight earned today
        </p>
      </div>

      <div className="mt-4"><LifeBar segments={hydrated ? game.segments : []} /></div>

      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3">
        <div>
          <dt className="text-sm text-muted">Consistency</dt>
          <dd className="num text-lg font-bold">{result.consistency.done} of {result.consistency.total} <span className="text-sm font-medium text-muted">boxes today</span></dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Streak</dt>
          <dd className="num text-lg font-bold">{game.streak} <span className="text-sm font-medium text-muted">{game.streak === 1 ? "day" : "days"}</span></dd>
        </div>
      </dl>

      <ol className="mt-3 flex justify-between" aria-label="This week">
        {game.week.map((day, i) => (
          <li key={day.date} className="flex flex-col items-center gap-1.5">
            <span className={`text-xs font-semibold ${day.isToday ? "text-ink" : "text-muted"}`}>{DAY_LETTERS[i]}</span>
            <span
              aria-label={`${day.date}: ${day.active ? "something ticked" : day.future ? "upcoming" : "nothing ticked"}`}
              className={`h-7 w-7 rounded-full border-2 ${day.active ? "border-accent bg-accent" : day.future ? "border-line" : "border-muted/50"} ${day.isToday ? "outline outline-2 outline-offset-2 outline-ink" : ""}`}
            />
          </li>
        ))}
      </ol>

      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="mt-4 text-sm font-semibold text-accent-text underline underline-offset-4">
        {open ? "Hide the explanation" : "What do these numbers mean?"}
      </button>
      {open && (
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
          <p><strong className="text-ink">Adherence, weighted by evidence.</strong> Of everything you took on from a paper, how much is in place today, with each item counted by how well it is supported: high certainty counts 1.0, moderate 0.7, low 0.4. A habit with no study behind it counts 0 here.</p>
          <p><strong className="text-ink">Consistency.</strong> Of today&apos;s tick boxes, how many you ticked. Every box counts the same, your own habits included.</p>
          <p><strong className="text-ink">Neither number measures your body.</strong> A tick records that you did something. Whether anything changed is a question only a measurement can answer.</p>
        </div>
      )}
    </section>
  );
}

function ProtocolTiles({ game }: { game: Game }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const open = game.protocols.find((v) => v.paper.slug === openSlug) ?? null;
  return (
    <section aria-label="Protocols from papers">
      <h2 className="display text-xl">From papers</h2>
      <ul className="mt-2 grid grid-cols-2 gap-2.5">
        {game.protocols.map((view) => (
          <li key={view.paper.id}>
            <button
              type="button" onClick={() => setOpenSlug(view.paper.slug)}
              className={`flex h-full w-full flex-col rounded-2xl border p-3 text-left ${view.progress.total > 0 && view.progress.done >= view.progress.total ? "border-accent bg-accent-soft" : "border-line bg-surface"}`}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="line-clamp-2 font-semibold leading-snug">{view.paper.category}</span>
                <ProgressRing pct={view.progress.pct} size={44} label={view.paper.category} />
              </span>
              <span className="num mt-auto pt-3 text-sm text-muted">
                {view.dormant ? "Paused. Open to resume." : `${view.progress.done} of ${view.progress.total} in place`}
              </span>
              <span className="mt-2 flex h-10 items-center justify-center rounded-lg border border-line bg-bg text-sm font-bold">Open</span>
            </button>
          </li>
        ))}
      </ul>
      <Sheet open={open !== null} onClose={() => setOpenSlug(null)} title={open?.paper.category ?? ""}>
        {open && <WidgetFor slug={open.paper.slug} variant="card" />}
      </Sheet>
    </section>
  );
}

function longDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

export function Dashboard() {
  const game = useGame();
  const hydrated = useStore((s) => s.hydrated);
  const unequipped = papers.filter((p) => !game.protocols.some((v) => v.paper.id === p.id));

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="display text-[2.5rem]">Life Game</h1>
        <p className="text-muted">{hydrated ? longDate(game.today) : "\u00a0"}</p>
      </header>

      <Companion input={{ done: game.result.consistency.done, total: game.result.consistency.total, streak: game.streak }} ready={hydrated} />

      <ScoreCard game={game} hydrated={hydrated} />

      {hydrated && game.conflicts.length > 0 && (
        <Notice tone="warn">
          <strong>Two of your tracks cannot both be met.</strong> See the highlighted protocol below and switch one track off.
        </Notice>
      )}

      <HabitTiles game={game} ready={hydrated} />

      {hydrated && game.protocols.length > 0 && <ProtocolTiles game={game} />}

      <DayComplete game={game} ready={hydrated} />

      {hydrated && unequipped.length > 0 && (
        <section aria-label="Add a protocol" className="rounded-2xl border border-line p-4">
          <h2 className="display text-xl">{game.protocols.length === 0 ? "Add a protocol from a paper" : "More from the library"}</h2>
          <p className="mt-1 text-sm leading-snug text-muted">Each read ends with a protocol you can add here. Those are the items that fill the bar.</p>
          <ul className="mt-2 divide-y divide-line">
            {unequipped.slice(0, 3).map((paper) => (
              <li key={paper.id}>
                <Link href={`/papers/${paper.slug}`} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="block text-sm text-muted">{paper.category}{paper.accessTier === "premium" ? ", members" : ""}</span>
                    <span className="block font-medium leading-snug">{paper.title}</span>
                  </span>
                  <span className="num shrink-0 text-sm text-muted">{paper.readMinutes} min</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/library" className="mt-2 flex h-11 items-center justify-center rounded-lg border border-line font-semibold">Browse the library</Link>
        </section>
      )}
    </div>
  );
}
