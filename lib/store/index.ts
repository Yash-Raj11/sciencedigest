/**
 * The app's memory on the device.
 *
 * Zustand, not React Context: a dashboard of a dozen trackers would repaint
 * every one of them on every tap with Context, and the sync layer has to read
 * state from outside React. Components subscribe to the slice they draw.
 *
 * Slices
 *   data      what the user did (see reduce.ts): equipped, ticks, program, habits
 *   queue     writes not yet sent to the server
 *   sync      where the queue stands
 *   session   who is signed in and their tier
 *
 * Saved to the device's localStorage so the app opens instantly and works
 * offline. The server stays the source of truth: see sync.ts.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { addDays, localToday } from "../dates";
import { EMPTY_DATA, HABIT_LABEL_MAX, MAX_AMOUNT, MAX_HABITS, UNIT_MAX, applyWrite, enqueue, neededFor, pruneTicks, type Data, type HabitKind, type Write } from "./reduce";

export type SyncStatus = "local" | "idle" | "syncing" | "offline" | "error";
export type Tier = "free" | "premium";

interface State {
  hydrated: boolean;
  data: Data;
  queue: Write[];
  sync: { status: SyncStatus; lastError: string | null; lastSyncedAt: string | null };
  session: { userId: string | null; anonymous: boolean; email: string | null; tier: Tier };
  /**
   * The visible "are you a person" check on Me. "needed" after the invisible
   * check failed twice; "dismissed" once the visitor closed it (it is not shown
   * again by itself); "done" once a token was handed over. Not saved: it
   * describes this visit, not what the user did.
   */
  humanCheck: "none" | "needed" | "dismissed" | "done";
  /** Demo mode only: lets you look at the app as a premium member without a database. */
  demoTier: Tier;

  /** The single way anything the user does enters the store. */
  dispatch: (write: Write) => void;
  toggleTick: (stepId: string, localDate?: string) => void;
  equip: (paperId: string, choices?: Record<string, string>) => void;
  unequip: (paperId: string) => void;
  setChoice: (paperId: string, key: string, value: string | null) => void;
  startBlock: (paperId: string, date: string | null) => void;
  addHabit: (label: string, spec?: { kind: HabitKind; unit?: string; target?: number }) => string | null;
  /** Target and count habits: set today's amount. The tick follows it. */
  setAmount: (habitId: string, amount: number, localDate?: string) => void;
  renameHabit: (id: string, label: string) => void;
  retireHabit: (id: string) => void;
}

export const STORAGE_KEY = "sd-store-v1";
const KEEP_DAYS = 400;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      data: EMPTY_DATA,
      queue: [],
      sync: { status: "local", lastError: null, lastSyncedAt: null },
      session: { userId: null, anonymous: true, email: null, tier: "free" },
      humanCheck: "none",
      demoTier: "free",

      dispatch: (write) => set((s) => ({ data: applyWrite(s.data, write), queue: enqueue(s.queue, write) })),

      toggleTick: (stepId, localDate = localToday()) => {
        const ticked = get().data.ticks[localDate]?.includes(stepId) ?? false;
        get().dispatch({ op: ticked ? "untick" : "tick", stepId, localDate });
      },

      equip: (paperId, choices) => {
        const { dispatch, data } = get();
        dispatch({ op: "equip", paperId, localDate: localToday() });
        if (choices && Object.keys(choices).length > 0 && !data.program[paperId]) {
          dispatch({ op: "program", paperId, blockStartedAt: null, choices });
        }
      },
      unequip: (paperId) => get().dispatch({ op: "unequip", paperId }),

      setChoice: (paperId, key, value) => {
        const current = get().data.program[paperId] ?? { blockStartedAt: null, choices: {} };
        const choices = { ...current.choices };
        if (value === null) delete choices[key];
        else choices[key] = value;
        get().dispatch({ op: "program", paperId, blockStartedAt: current.blockStartedAt, choices });
      },
      startBlock: (paperId, date) => {
        const current = get().data.program[paperId] ?? { blockStartedAt: null, choices: {} };
        get().dispatch({ op: "program", paperId, blockStartedAt: date, choices: current.choices });
      },

      setAmount: (habitId, amount, localDate = localToday()) => {
        const habit = get().data.habits.find((h) => h.id === habitId);
        if (!habit || habit.kind === "check") return;
        const clamped = Math.max(0, Math.min(MAX_AMOUNT, Math.round(amount)));
        get().dispatch({ op: "amount", stepId: habitId, localDate, amount: clamped, needed: neededFor(habit) });
      },

      addHabit: (raw, spec) => {
        const label = raw.trim().replace(/\s+/g, " ").slice(0, HABIT_LABEL_MAX);
        const live = get().data.habits.filter((h) => !h.retired);
        if (label.length === 0 || live.length >= MAX_HABITS) return null;
        const id = crypto.randomUUID();
        const position = Math.max(0, ...get().data.habits.map((h) => h.position)) + 1;
        const kind = spec?.kind ?? "check";
        const unit = kind === "check" ? null : (spec?.unit ?? "").trim().slice(0, UNIT_MAX) || "times";
        const target = kind === "target" ? Math.max(1, Math.min(MAX_AMOUNT, Math.round(spec?.target ?? 1))) : null;
        get().dispatch({ op: "habit_add", id, label, position, kind, unit, target });
        return id;
      },
      renameHabit: (id, raw) => {
        const label = raw.trim().replace(/\s+/g, " ").slice(0, HABIT_LABEL_MAX);
        if (label.length > 0) get().dispatch({ op: "habit_update", id, label });
      },
      retireHabit: (id) => get().dispatch({ op: "habit_update", id, retired: true }),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      // v1 had no amounts and no habit kinds. Fill them in; nothing is lost.
      migrate: (saved) => {
        const state = saved as { data?: Partial<Data> };
        if (state.data) {
          state.data.amounts ??= {};
          state.data.habits = (state.data.habits ?? []).map((h) => ({ ...h, kind: h.kind ?? "check", unit: h.unit ?? null, target: h.target ?? null }));
        }
        return state as never;
      },
      storage: createJSONStorage(() => localStorage),
      // Rehydration is started by <StoreBoot/> after first paint, so the first
      // client render matches the server's HTML.
      skipHydration: true,
      partialize: (s) => ({
        data: {
          ...s.data,
          ticks: pruneTicks(s.data.ticks, addDays(localToday(), -KEEP_DAYS)),
          amounts: pruneTicks(s.data.amounts, addDays(localToday(), -KEEP_DAYS)),
        },
        queue: s.queue,
        demoTier: s.demoTier,
      }),
    },
  ),
);

/** Read the store from outside React (the sync layer does). */
export const store = useStore;
