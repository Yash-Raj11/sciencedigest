"use client";

/**
 * What membership adds INSIDE a paper the reader already has: implementation
 * notes drawn from the paper, and a look back at their own last eight weeks.
 *
 * Whether the viewer may see either is decided on the server. This component
 * only draws what comes back: content, or "locked".
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { stepsFor } from "@/lib/content";
import { loadRegimen, loadTakeaways, type Gated, type Regimen } from "@/lib/content/gated";
import type { PaperMeta, Sentence } from "@/lib/content/types";
import { useStore } from "@/lib/store";
import { isDemo } from "@/lib/supabase/client";

function weekLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function RegimenChart({ regimen }: { regimen: Regimen }) {
  const tallest = Math.max(1, ...regimen.weeks.map((w) => Math.max(w.sessions, w.target ?? 0)));
  return (
    <div>
      <ol className="flex items-end gap-1.5" aria-label="Sessions logged in each of the last eight weeks">
        {regimen.weeks.map((week) => (
          <li key={week.week_start} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="num text-xs font-medium">{week.sessions}</span>
            <span className="flex h-20 w-full items-end rounded-sm bg-line/50">
              <span
                className={`w-full rounded-sm ${week.met ? "bg-ink" : "bg-muted/60"}`}
                style={{ height: `${(week.sessions / tallest) * 100}%` }}
              />
            </span>
            <span className="num w-full truncate text-center text-[0.6875rem] text-muted">{weekLabel(week.week_start)}</span>
          </li>
        ))}
      </ol>
      <p className="num mt-3 text-sm leading-snug">
        You met the weekly target in <strong>{regimen.weeks_met} of 8</strong> weeks.
        {regimen.block.days_elapsed !== null && <> Your block is on day {regimen.block.days_elapsed}.</>}
      </p>
      <p className="mt-1 text-sm leading-snug text-muted">
        This counts sessions you logged. It cannot tell you what changed in your body; only a measurement can.
      </p>
    </div>
  );
}

export function MemberExtras({ paper }: { paper: PaperMeta }) {
  const hydrated = useStore((s) => s.hydrated);
  const tier = useStore((s) => (isDemo ? s.demoTier : s.session.tier));
  const userId = useStore((s) => s.session.userId);
  const equipped = useStore((s) => s.data.equipped.some((e) => e.paperId === paper.id));
  const hasWeeklyTarget = stepsFor(paper.id).some((s) => s.kind === "weekly_target");

  const [takeaways, setTakeaways] = useState<Gated<Sentence[][]> | null>(null);
  const [regimen, setRegimen] = useState<Gated<Regimen> | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    void loadTakeaways(paper, tier).then((r) => { if (!cancelled) setTakeaways(r); });
    if (hasWeeklyTarget && equipped) void loadRegimen(paper, tier).then((r) => { if (!cancelled) setRegimen(r); });
    return () => { cancelled = true; };
  }, [hydrated, paper, tier, userId, equipped, hasWeeklyTarget]);

  if (!hydrated || takeaways === null) return null;
  const locked = takeaways.state === "locked";

  return (
    <section aria-label="Membership extras" className="rounded-2xl border border-line p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="headline">Going further</h2>
        <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-ink">Members</span>
      </div>

      {locked ? (
        <>
          <ul className="mt-3 space-y-2 text-[0.9375rem] leading-snug">
            <li><strong>Implementation notes.</strong> The settings this paper supports, each tied to its estimate.</li>
            {hasWeeklyTarget && <li><strong>Your last eight weeks.</strong> Sessions logged each week against the protocol&apos;s target.</li>}
          </ul>
          <p className="mt-3 text-sm leading-snug text-muted">Tracking, your streak and your history stay free whether or not you join.</p>
          <Link href="/upgrade" className="mt-3 flex h-11 items-center justify-center rounded-lg border border-line font-medium text-ink">
            See what membership adds
          </Link>
        </>
      ) : (
        <div className="mt-3 space-y-5">
          {takeaways.state === "ok" && takeaways.value.length > 0 && (
            <div>
              <h3 className="font-medium">Implementation notes</h3>
              <ul className="mt-2 space-y-2">
                {takeaways.value.map((note, i) => (
                  <li key={i} className="flex gap-3 text-[0.9375rem] leading-relaxed">
                    <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                    <span>{note.map((s) => s.text).join(" ")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {takeaways.state === "error" && <p className="text-sm text-muted">The notes did not load: {takeaways.message}.</p>}

          {hasWeeklyTarget && (
            <div>
              <h3 className="font-medium">Your last eight weeks</h3>
              <div className="mt-2">
                {!equipped && <p className="text-sm leading-snug text-muted">Add the protocol above and log sessions; your weeks appear here.</p>}
                {equipped && regimen?.state === "ok" && <RegimenChart regimen={regimen.value} />}
                {equipped && regimen?.state === "error" && <p className="text-sm text-muted">The analysis did not load: {regimen.message}.</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
