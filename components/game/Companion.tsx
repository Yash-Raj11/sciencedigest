"use client";

/**
 * The companion: a cat by default, or the user's own picture.
 *
 * It reacts to what was logged today (lib/companion/mood.ts) and to taps.
 * It has no sick or dying state and never says anything about health.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { readAvatar, subscribeAvatar } from "@/lib/companion/avatar";
import { lineFor, moodOf, type Mood, type MoodInput } from "@/lib/companion/mood";

const MOOD_NAME: Record<Mood, string> = {
  resting: "asleep", waiting: "awake and waiting", alert: "perked up", lively: "lively", glowing: "delighted",
};

/** Tail angle and eye shape per mood: the whole "animation rig". */
const POSE: Record<Mood, { tail: number; eyes: "closed" | "open" | "wide" | "happy" }> = {
  resting: { tail: 28, eyes: "closed" },
  waiting: { tail: 12, eyes: "open" },
  alert: { tail: -4, eyes: "open" },
  lively: { tail: -18, eyes: "wide" },
  glowing: { tail: -30, eyes: "happy" },
};

function Eyes({ kind }: { kind: "closed" | "open" | "wide" | "happy" }) {
  const stroke = { stroke: "var(--accent-ink)", strokeWidth: 2.6, strokeLinecap: "round" as const, fill: "none" };
  if (kind === "closed") return <><path d="M43 53 q6 4 12 0" {...stroke} /><path d="M65 53 q6 4 12 0" {...stroke} /></>;
  if (kind === "happy") return <><path d="M43 55 q6 -8 12 0" {...stroke} /><path d="M65 55 q6 -8 12 0" {...stroke} /></>;
  const ry = kind === "wide" ? 6.5 : 5;
  return (
    <>
      <ellipse cx="49" cy="53" rx="4" ry={ry} fill="var(--accent-ink)" />
      <ellipse cx="71" cy="53" rx="4" ry={ry} fill="var(--accent-ink)" />
      <circle cx="50.5" cy="51" r="1.4" fill="var(--accent)" />
      <circle cx="72.5" cy="51" r="1.4" fill="var(--accent)" />
    </>
  );
}

export function Cat({ mood }: { mood: Mood }) {
  const pose = POSE[mood];
  const moving = mood === "lively" || mood === "glowing";
  return (
    <svg viewBox="0 0 120 124" className="h-full w-full" aria-hidden>
      {mood === "glowing" && <circle cx="60" cy="64" r="56" fill="none" stroke="var(--accent)" strokeWidth="2" className="companion-halo" />}
      <g opacity={mood === "resting" ? 0.55 : 1} style={{ transition: "opacity 400ms" }}>
        <g style={{ transformOrigin: "84px 100px", transform: `rotate(${pose.tail}deg)`, transition: "transform 500ms cubic-bezier(0.2,0.8,0.2,1)" }}>
          <path d="M84 100 q26 -2 22 -30" fill="none" stroke="var(--accent)" strokeWidth="9" strokeLinecap="round" className={moving ? "companion-tail" : ""} />
        </g>
        <ellipse cx="60" cy="92" rx="30" ry="25" fill="var(--accent)" />
        <path d="M36 36 L40 10 L56 28 Z M84 36 L80 10 L64 28 Z" fill="var(--accent)" />
        <path d="M41 30 L42.5 18 L50 27 Z M79 30 L77.5 18 L70 27 Z" fill="var(--accent-ink)" opacity="0.28" />
        <circle cx="60" cy="52" r="27" fill="var(--accent)" />
        <Eyes kind={pose.eyes} />
        <path d="M57 62 h6 l-3 3.5 Z" fill="var(--accent-ink)" />
        <path d="M60 65.5 q-4 5 -8 1 M60 65.5 q4 5 8 1" fill="none" stroke="var(--accent-ink)" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M38 60 h-12 M38 65 l-11 4 M82 60 h12 M82 65 l11 4" stroke="var(--accent-ink)" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
        <ellipse cx="48" cy="112" rx="8" ry="5" fill="var(--accent)" stroke="var(--accent-ink)" strokeOpacity="0.25" />
        <ellipse cx="72" cy="112" rx="8" ry="5" fill="var(--accent)" stroke="var(--accent-ink)" strokeOpacity="0.25" />
      </g>
      {mood === "resting" && (
        <g fill="var(--muted)" fontFamily="var(--font-sans)" fontWeight="700">
          <text x="92" y="30" fontSize="13">z</text>
          <text x="101" y="19" fontSize="10">z</text>
        </g>
      )}
    </svg>
  );
}

function Photo({ src, mood }: { src: string; mood: Mood }) {
  const ring = { resting: 2, waiting: 3, alert: 4, lively: 5, glowing: 6 }[mood];
  return (
    <span className="relative block h-full w-full">
      {mood === "glowing" && <span aria-hidden className="companion-halo absolute -inset-1.5 rounded-full border-2 border-accent" />}
      {/* A data: URL from this device's own storage; next/image has nothing to optimise. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src} alt=""
        className="h-full w-full rounded-full object-cover"
        style={{
          boxShadow: `0 0 0 ${ring}px ${mood === "resting" ? "var(--line)" : "var(--accent)"}`,
          filter: mood === "resting" ? "grayscale(1) opacity(0.6)" : "none",
          transition: "box-shadow 400ms, filter 400ms",
        }}
      />
    </span>
  );
}

export function useAvatar(): string | null {
  return useSyncExternalStore(subscribeAvatar, readAvatar, () => null);
}

export function CompanionFigure({ mood, size = "h-24 w-24" }: { mood: Mood; size?: string }) {
  const avatar = useAvatar();
  return <span className={`block shrink-0 ${size}`}>{avatar ? <Photo src={avatar} mood={mood} /> : <Cat mood={mood} />}</span>;
}

export function Companion({ input, ready }: { input: MoodInput; ready: boolean }) {
  const mood = ready ? moodOf(input) : "resting";
  const [pokes, setPokes] = useState(0);
  const figure = useRef<HTMLButtonElement>(null);

  // A tick (or a tap) makes it hop once. Driven from an effect so the hop
  // happens when the count actually changes, not on every repaint.
  useEffect(() => {
    if (!ready) return;
    figure.current?.animate(
      [{ transform: "translateY(0) scale(1)" }, { transform: "translateY(-7px) scale(1.06)" }, { transform: "translateY(0) scale(1)" }],
      { duration: 360, easing: "cubic-bezier(0.2,0.8,0.2,1)" },
    );
  }, [input.done, pokes, ready]);

  const taps = ["", "Purr.", "Tick something and watch.", "Still here."];
  const said = pokes === 0 ? lineFor(mood, input) : taps[pokes % taps.length] || lineFor(mood, input);

  return (
    <section aria-label="Your companion" className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
      <button
        ref={figure} type="button" onClick={() => setPokes((n) => n + 1)}
        aria-label={`Your companion is ${MOOD_NAME[mood]}. Tap to say hello.`}
        className="rounded-full motion-reduce:!transform-none"
      >
        <CompanionFigure mood={mood} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted">{ready ? MOOD_NAME[mood].charAt(0).toUpperCase() + MOOD_NAME[mood].slice(1) : " "}</p>
        <p className="mt-0.5 font-semibold leading-snug" aria-live="polite">{ready ? said : " "}</p>
        <p className="mt-1 text-xs leading-snug text-muted">Follows what you tick. It cannot see your health.</p>
      </div>
    </section>
  );
}
