"use client";

/**
 * The slot at the top of the feed: the companion, "Life Game", today's steps
 * and the adherence bar. One link to /today; it holds no button.
 *
 * It is a slot: the feed takes any node as `top` (app/page.tsx), so this can be
 * swapped for something else without touching the feed.
 */

import Link from "next/link";
import { CompanionFigure } from "./Companion";
import { moodOf } from "@/lib/companion/mood";
import { useStore } from "@/lib/store";
import { useGame } from "@/lib/store/game";

export function FeedSlot() {
  const game = useGame();
  const hydrated = useStore((s) => s.hydrated);
  const { done, total } = game.result.consistency;
  const pct = hydrated ? game.result.pct : 0;
  const mood = hydrated ? moodOf({ done, total, streak: game.streak }) : "resting";
  const steps = !hydrated ? " " : total === 0 ? "No steps yet. Add one from a read." : `${done} of ${total} steps today`;

  return (
    <Link href="/today" data-feed-slot className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-4">
      <CompanionFigure mood={mood} size="h-16 w-16" />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="display text-xl">Life Game</span>
          <span className="num text-sm font-bold" data-slot-pct>{pct}%</span>
        </span>
        <span className="num mt-0.5 block text-sm leading-snug text-muted" data-slot-steps>{steps}</span>
        <span
          role="progressbar" aria-label="Adherence today, weighted by evidence" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
          className="mt-2 block h-2.5 overflow-hidden rounded-full bg-line"
        >
          <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </span>
      </span>
      <span aria-hidden className="font-semibold text-accent-text">→</span>
    </Link>
  );
}
