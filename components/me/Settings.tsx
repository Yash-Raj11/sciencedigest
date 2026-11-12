"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CompanionFigure, useAvatar } from "@/components/game/Companion";
import { GradeChip, Notice } from "@/components/protocol/primitives";
import { clearAvatar, saveAvatar } from "@/lib/companion/avatar";
import { EVIDENCE_GRADES } from "@/lib/evidence";
import { DORMANCY_DAYS } from "@/lib/score";
import { useStore } from "@/lib/store";
import { linkEmail } from "@/lib/store/sync";
import { isDemo } from "@/lib/supabase/client";
import { applyThemeChoice, readThemeChoice, type ThemeChoice } from "@/lib/theme";

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "Match device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function Appearance() {
  // Read after mount: the saved choice only exists in the browser.
  const [choice, setChoice] = useState<ThemeChoice | null>(null);
  useEffect(() => {
    const saved = readThemeChoice();
    queueMicrotask(() => setChoice(saved));
  }, []);

  return (
    <section aria-label="Appearance" className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="display text-xl">Appearance</h2>
      <div className="mt-3 flex gap-2" role="group" aria-label="Theme">
        {THEMES.map((theme) => (
          <button
            key={theme.value} type="button" aria-pressed={choice === theme.value}
            onClick={() => { applyThemeChoice(theme.value); setChoice(theme.value); }}
            className={`h-11 min-w-0 flex-1 rounded-lg border text-sm font-semibold ${choice === theme.value ? "border-accent bg-accent text-accent-ink" : "border-line bg-bg"}`}
          >
            {theme.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function CompanionChoice() {
  const avatar = useAvatar();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <section aria-label="Your companion" className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="display text-xl">Your companion</h2>
      <div className="mt-3 flex items-center gap-4">
        <CompanionFigure mood="lively" size="h-20 w-20" />
        <p className="min-w-0 flex-1 text-sm leading-snug text-muted">
          {avatar
            ? "Your own picture. It is kept on this device only and is never uploaded."
            : "A cat, for everyone to start with. You can use your own picture instead; it stays on this device and is never uploaded."}
        </p>
      </div>
      <div className="mt-3 flex gap-2">
        <label className="flex h-11 flex-1 cursor-pointer items-center justify-center rounded-lg bg-accent font-bold text-accent-ink focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
          {avatar ? "Change picture" : "Use my own picture"}
          <input
            type="file" accept="image/*" className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) setMessage((await saveAvatar(file)).message ?? null);
            }}
          />
        </label>
        {avatar && <button type="button" onClick={() => { clearAvatar(); setMessage(null); }} className="h-11 rounded-lg border border-line px-4 font-semibold">Back to the cat</button>}
      </div>
      {message && <p className="mt-2 text-sm" role="status">{message}</p>}
    </section>
  );
}

const SYNC_TEXT = {
  local: "Kept on this device.",
  idle: "Everything is saved.",
  syncing: "Saving…",
  offline: "You are offline. Your ticks are kept here and sent when you are back.",
  error: "Could not reach the server. Trying again shortly.",
} as const;

function Account() {
  const session = useStore((s) => s.session);
  const sync = useStore((s) => s.sync);
  const waiting = useStore((s) => s.queue.length);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (isDemo) {
    return (
      <section aria-label="Account" className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="display text-xl">Account</h2>
        <div className="mt-3">
          <Notice tone="warn">
            <strong>Demo mode.</strong> This copy of the app is not connected to a database, so everything you tick is kept on this device only. The operations manual (docs/MANUAL.md, part 3) shows how to connect one.
          </Notice>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Account" className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="display text-xl">Account</h2>
      <p className="mt-1 text-sm leading-snug text-muted">
        {SYNC_TEXT[sync.status]}{waiting > 0 ? ` ${waiting} waiting to send.` : ""}
      </p>
      {sync.lastError && sync.status === "error" && <p className="mt-1 text-sm text-muted">Last problem: {sync.lastError}</p>}

      {session.email ? (
        <p className="mt-3 leading-snug">Signed in as <strong>{session.email}</strong>. Your progress follows you to any device.</p>
      ) : (
        <form
          className="mt-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setResult(await linkEmail(email.trim()));
            setBusy(false);
          }}
        >
          <label htmlFor="email" className="block font-medium leading-snug">Keep your progress on every device</label>
          <p className="text-sm leading-snug text-muted">
            You are already tracking without an account. Add an email and the same history is attached to it: nothing is reset.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-base text-ink placeholder:text-muted"
            />
            <button type="submit" disabled={busy} className="h-11 rounded-lg bg-accent px-4 font-bold text-accent-ink disabled:opacity-40">
              {busy ? "Sending" : "Add email"}
            </button>
          </div>
          {result && <p className="mt-2 text-sm leading-snug" role="status">{result.message}</p>}
        </form>
      )}
    </section>
  );
}

function Membership() {
  const tier = useStore((s) => (isDemo ? s.demoTier : s.session.tier));
  return (
    <section aria-label="Membership" className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="display text-xl">Membership</h2>
      <p className="mt-1 leading-snug">{tier === "premium" ? "You are a member." : "You are on the free plan. Tracking, your streak and your history are free for good."}</p>
      {isDemo && (
        <button
          type="button" role="switch" aria-checked={tier === "premium"}
          onClick={() => useStore.setState({ demoTier: tier === "premium" ? "free" : "premium" })}
          className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-bg px-3.5 py-3 text-left"
        >
          <span>
            <span className="block font-medium leading-snug">Preview the app as a member</span>
            <span className="block text-sm leading-snug text-muted">Demo mode only. Opens the members&apos; read and extras so you can check them.</span>
          </span>
          <span aria-hidden className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${tier === "premium" ? "bg-accent" : "bg-line"}`}>
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-bg transition-[left] ${tier === "premium" ? "left-6" : "left-1"}`} />
          </span>
        </button>
      )}
      <Link href="/upgrade" className="mt-3 flex h-11 items-center justify-center rounded-lg border border-line font-semibold">What membership adds</Link>
    </section>
  );
}

function Scoring() {
  return (
    <section aria-label="How scoring works" className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="display text-xl">How your score works</h2>
      <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">
        Each requirement from a paper counts by how far its evidence can be trusted. Well-supported actions fill more of your bar than popular ones with thin evidence behind them.
      </p>
      <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-bg">
        {EVIDENCE_GRADES.map((grade) => (
          <li key={grade} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <span className="text-sm leading-snug">
              {{ high: "Strong trials that agree", moderate: "Trials with some doubt", low: "Observational, or trials that disagree", none: "Your own habits, or no human study" }[grade]}
            </span>
            <GradeChip grade={grade} />
          </li>
        ))}
      </ul>
      <ul className="mt-3 space-y-2 text-[0.9375rem] leading-relaxed text-muted">
        <li>A protocol you have not touched for {DORMANCY_DAYS} days pauses and stops counting against you. Resume it any time.</li>
        <li>Weekly targets and block lengths are worked out from your log. They have no tick box, so they cannot be claimed by tapping.</li>
        <li>No number here measures your body. A tick records that you did something.</li>
      </ul>
    </section>
  );
}

export function Settings() {
  const hydrated = useStore((s) => s.hydrated);
  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="display text-[2.5rem]">Me</h1>
      </header>
      <Appearance />
      <CompanionChoice />
      {hydrated && <Account />}
      {hydrated && <Membership />}
      <Scoring />
      <p className="text-sm leading-snug text-muted">
        Science Digest summarises published research. It is not medical advice and does not replace a clinician who knows you.
      </p>
    </div>
  );
}
