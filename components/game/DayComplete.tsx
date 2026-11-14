"use client";

/**
 * The one celebratory moment in the app: the tick that completes the day.
 * Shown once per day, only when the last box is ticked while you watch (not
 * when you open the app on an already-finished day).
 */

import { useEffect, useRef, useState } from "react";
import { CompanionFigure } from "./Companion";
import { Sheet } from "@/components/shell/Sheet";
import type { Game } from "@/lib/store/game";

const KEY = "sd-day-complete";

export function DayComplete({ game, ready }: { game: Game; ready: boolean }) {
  const { done, total } = game.result.consistency;
  const complete = total > 0 && done >= total;
  const before = useRef<boolean | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const was = before.current;
    before.current = complete;
    if (was !== false || !complete) return;
    try {
      if (localStorage.getItem(KEY) === game.today) return;
      localStorage.setItem(KEY, game.today);
    } catch { /* storage blocked: celebrate anyway */ }
    queueMicrotask(() => setOpen(true));
  }, [complete, ready, game.today]);

  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="Today is complete">
      <div className="flex flex-col items-center pb-2 text-center">
        <div className="day-burst relative my-4"><CompanionFigure mood="glowing" size="h-36 w-36" /></div>
        <p className="num text-lg font-medium">{done} of {total} boxes ticked.</p>
        <dl className="mt-4 grid w-full grid-cols-2 gap-2.5 text-left">
          <div className="rounded-xl border border-line bg-surface p-3">
            <dt className="text-sm text-muted">Streak</dt>
            <dd className="num"><span className="figure text-[2rem]">{game.streak}</span> {game.streak === 1 ? "day" : "days"}</dd>
          </div>
          <div className="rounded-xl border border-line bg-surface p-3">
            <dt className="text-sm text-muted">Evidence-weighted</dt>
            <dd className="num"><span className="figure text-[2rem]">{game.result.pct}</span>%</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm leading-snug text-muted">This records what you did today. Weekly targets and block lengths keep counting on their own.</p>
      </div>
    </Sheet>
  );
}
