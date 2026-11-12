/**
 * What the user did, and how each action changes it.
 *
 * `Data` is the whole of a person's tracked state. `Write` is one thing they
 * did. `applyWrite` is the only place a write changes data, and it is used
 * three ways:
 *
 *   - on tap, to update the screen at once (optimistic)
 *   - by the sync queue, as the description of what to send to the server
 *   - after a pull, to replay not-yet-sent writes on top of the server's copy
 *
 * The data holds ids and dates only. No labels from papers, no weights, no
 * scores: those are looked up or computed, so correcting a number in a paper
 * reaches every user on their next visit. (A user's own habit label is the one
 * exception: they wrote it, so it is theirs.)
 *
 * Pure: no imports from supabase, react or next.
 */

import type { ProgramState } from "../score";

/**
 * check: tick it off.  target: reach a daily number.  count: log each one.
 * Fixed when the habit is made: changing it would change what old days mean.
 */
export type HabitKind = "check" | "target" | "count";

export interface Habit {
  id: string;
  label: string;
  position: number;
  retired: boolean;
  kind: HabitKind;
  /** "pages", "glasses". null for a check habit. */
  unit: string | null;
  /** Daily number to reach. Only a target habit has one. */
  target: number | null;
}

/** The amount at which a target or count habit is done for the day. */
export function neededFor(habit: Pick<Habit, "target">): number {
  return habit.target ?? 1;
}

export interface Data {
  /** Protocols in play. `since` is the local date of the most recent (re-)equip. */
  equipped: { paperId: string; since: string }[];
  /** local date -> ids of the steps ticked that day. */
  ticks: Record<string, string[]>;
  program: Record<string, ProgramState>;
  habits: Habit[];
  /** local date -> habit id -> amount logged. Detail beside the tick; scoring never reads it. */
  amounts: Record<string, Record<string, number>>;
}

export type Write =
  | { op: "tick"; stepId: string; localDate: string }
  | { op: "untick"; stepId: string; localDate: string }
  | { op: "equip"; paperId: string; localDate: string }
  | { op: "unequip"; paperId: string }
  | { op: "program"; paperId: string; blockStartedAt: string | null; choices: Record<string, string> }
  /** `needed` travels with the write so replaying it never depends on a lookup. */
  | { op: "amount"; stepId: string; localDate: string; amount: number; needed: number }
  | { op: "habit_add"; id: string; label: string; position: number; kind?: HabitKind; unit?: string | null; target?: number | null }
  | { op: "habit_update"; id: string; label?: string; retired?: boolean };

export const EMPTY_DATA: Data = { equipped: [], ticks: {}, program: {}, habits: [], amounts: {} };

export const MAX_AMOUNT = 100000;
export const UNIT_MAX = 20;

export const MAX_HABITS = 30;
export const HABIT_LABEL_MAX = 120;

export function applyWrite(data: Data, write: Write): Data {
  switch (write.op) {
    case "tick": {
      const day = data.ticks[write.localDate] ?? [];
      if (day.includes(write.stepId)) return data;
      return { ...data, ticks: { ...data.ticks, [write.localDate]: [...day, write.stepId] } };
    }
    case "untick": {
      const day = data.ticks[write.localDate];
      if (!day?.includes(write.stepId)) return data;
      const rest = day.filter((id) => id !== write.stepId);
      const ticks = { ...data.ticks };
      if (rest.length > 0) ticks[write.localDate] = rest;
      else delete ticks[write.localDate];
      return { ...data, ticks };
    }
    case "equip":
      return {
        ...data,
        equipped: [...data.equipped.filter((e) => e.paperId !== write.paperId), { paperId: write.paperId, since: write.localDate }],
      };
    case "unequip":
      return { ...data, equipped: data.equipped.filter((e) => e.paperId !== write.paperId) };
    case "program":
      return {
        ...data,
        program: { ...data.program, [write.paperId]: { blockStartedAt: write.blockStartedAt, choices: write.choices } },
      };
    case "amount": {
      // The tick follows the amount, exactly as the database trigger does it.
      const amount = Math.max(0, Math.min(MAX_AMOUNT, Math.round(write.amount)));
      const withAmount: Data = {
        ...data,
        amounts: { ...data.amounts, [write.localDate]: { ...(data.amounts ?? {})[write.localDate], [write.stepId]: amount } },
      };
      return applyWrite(withAmount, { op: amount >= write.needed ? "tick" : "untick", stepId: write.stepId, localDate: write.localDate });
    }
    case "habit_add":
      if (data.habits.some((h) => h.id === write.id)) return data;
      return {
        ...data,
        habits: [...data.habits, {
          id: write.id, label: write.label, position: write.position, retired: false,
          kind: write.kind ?? "check", unit: write.unit ?? null, target: write.target ?? null,
        }],
      };
    case "habit_update":
      return {
        ...data,
        habits: data.habits.map((h) =>
          h.id === write.id ? { ...h, label: write.label ?? h.label, retired: write.retired ?? h.retired } : h),
      };
  }
}

/** Which pending write, if any, the new one makes pointless. Last write wins. */
function supersedes(next: Write, earlier: Write): boolean {
  if ((next.op === "tick" || next.op === "untick") && (earlier.op === "tick" || earlier.op === "untick")) {
    return next.stepId === earlier.stepId && next.localDate === earlier.localDate;
  }
  if (next.op === "amount" && earlier.op === "amount") {
    return next.stepId === earlier.stepId && next.localDate === earlier.localDate;
  }
  if (next.op === "program" && earlier.op === "program") return next.paperId === earlier.paperId;
  return false;
}

/** Adds a write to the queue, dropping any earlier pending write it replaces. */
export function enqueue(queue: Write[], write: Write): Write[] {
  return [...queue.filter((earlier) => !supersedes(write, earlier)), write];
}

/**
 * A write the server keeps refusing for now (see StuckWrite in remote.ts), set
 * aside so the rest of the queue can go. Kept on the device until the server
 * takes it; nothing else removes it, except a newer write that replaces it
 * under the same last-write-wins rule as the queue.
 *
 * `code` and `since` are the one thing saved on the device that is not "what
 * the user did": the server's error code and when the write was set aside.
 * They describe the write, not the person (BUILD-LOG, 2026-11-13).
 */
export interface HeldWrite {
  write: Write;
  /** The server's error code, e.g. "PGRST202". Shown on Me as the reason. */
  code: string;
  /** ISO time the write was set aside. */
  since: string;
}

/** Server refusals in a row before a write is set aside. With the 2 s, 4 s backoff: about six seconds. */
export const HOLD_AFTER = 3;

/** What a write is about. Writes about the same thing must reach the server in the order they were made. */
function subject(write: Write): string {
  switch (write.op) {
    case "tick": case "untick": case "amount": return `step:${write.stepId}`;
    case "habit_add": case "habit_update": return `step:${write.id}`;
    case "equip": case "unequip": case "program": return `paper:${write.paperId}`;
  }
}

/** Same habit or step (on any day), or same paper. */
export function related(a: Write, b: Write): boolean {
  return subject(a) === subject(b);
}

interface Pending { queue: Write[]; held: HeldWrite[] }

function behind(held: HeldWrite[], write: Write, code: string, since: string): HeldWrite[] {
  return [...held.filter((earlier) => !supersedes(write, earlier.write)), { write, code, since }];
}

/**
 * Sets `write` aside, and with it every queued write about the same thing, in
 * their original order, so none of them can reach the server ahead of it.
 * If `write` is no longer queued (a newer one replaced it meanwhile), nothing changes.
 */
export function hold(pending: Pending, write: Write, code: string, since: string): Pending {
  if (!pending.queue.includes(write)) return pending;
  let held = pending.held;
  const queue: Write[] = [];
  for (const queued of pending.queue) {
    if (queued === write || related(queued, write)) held = behind(held, queued, code, since);
    else queue.push(queued);
  }
  return { queue, held };
}

/**
 * Where a new write goes. Normally the queue. If a held write is about the
 * same thing, it goes behind that one on the held list instead: sent first, it
 * could be overwritten later by the older held write, or refused because the
 * thing it depends on (a held "add habit") is not on the server yet.
 */
export function enqueuePending(pending: Pending, write: Write, now: string): Pending {
  const ahead = pending.held.find((earlier) => related(earlier.write, write));
  if (!ahead) return { queue: enqueue(pending.queue, write), held: pending.held };
  return { queue: pending.queue, held: behind(pending.held, write, ahead.code, now) };
}

/**
 * After a pull: the server's copy, with everything not yet on the server
 * replayed on top. Held writes first: the queue never holds a write about the
 * same thing as a held one, so the two lists cannot disagree.
 */
export function reconcile(server: Data, queue: Write[], held: HeldWrite[] = []): Data {
  return [...held.map((h) => h.write), ...queue].reduce(applyWrite, server);
}

/** The version of the saved state. 3 added `held`. */
export const SAVED_VERSION = 3;

/**
 * Brings an older saved state up to date. Nothing is ever removed.
 *   v1 -> v2: amounts and habit kinds did not exist; fill them in.
 *   v2 -> v3: the held list did not exist; it starts empty.
 */
export function migrateSaved(saved: unknown): unknown {
  const state = (saved ?? {}) as { data?: Partial<Data>; held?: HeldWrite[] };
  if (state.data) {
    state.data.amounts ??= {};
    state.data.habits = (state.data.habits ?? []).map((h) => ({ ...h, kind: h.kind ?? "check", unit: h.unit ?? null, target: h.target ?? null }));
  }
  state.held ??= [];
  return state;
}

/** Flattens ticks into the rows the scoring function wants. */
export function checkinsOf(ticks: Data["ticks"]): { stepId: string; localDate: string }[] {
  const out: { stepId: string; localDate: string }[] = [];
  for (const [localDate, ids] of Object.entries(ticks)) for (const stepId of ids) out.push({ stepId, localDate });
  return out;
}

/** Drops ticks older than `keepDays` so the saved state cannot grow without limit. */
export function pruneTicks<T>(byDate: Record<string, T>, oldestKept: string): Record<string, T> {
  return Object.fromEntries(Object.entries(byDate ?? {}).filter(([date]) => date >= oldestKept));
}
