/**
 * What a reader types into a simulator (a caffeine time, the days they tick, a routine they
 * pick), remembered on this device so it is there when they reopen the read (docs/SIMULATORS.md
 * section e; owner, 2026-11-19).
 *
 * A scratchpad, not user history. It never goes to the server, the device store
 * (lib/store/reduce.ts) or its sync queue: CLAUDE.md rule 5 covers what the user did, and this
 * is not that. Like the theme (lib/theme.ts) it lives in localStorage, read and written in
 * try/catch, with a safe default when storage is missing, blocked or holds junk.
 *
 * One key per paper and per simulator, `sd.sim.<slug>.<simulator>`, so one read never reads
 * another's input and a correction to one read touches nothing else. The value is versioned
 * JSON, and every field is checked against the simulator's own range and shape when it is read
 * and before it is written. A field that fails is dropped, never clamped into a value the reader
 * did not type, so an unset input stays unset (H12).
 *
 * Pure: no React, no Next, no Supabase. The hook that wires it into a read is
 * components/read/remembered.tsx; figures receive the values as props and never import this
 * file's storage.
 */

export const READER_INPUTS_PREFIX = "sd.sim.";
export const READER_INPUTS_VERSION = 1;
/** Longer than any real answer: anything bigger is junk and is not parsed. */
const MAX_STORED = 4096;
const PART = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The part of the Web Storage API this file uses, so a test can hand it any storage. */
export interface DeviceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length: number;
  key(index: number): string | null;
}

/** The browser's localStorage, or null where there is none or it is blocked. */
export function deviceStorage(): DeviceStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** `sd.sim.<slug>.<simulator>`. Both parts are kebab-case, so two keys can never run together. */
export function inputsKey(slug: string, simulator: string): string {
  if (!PART.test(slug) || !PART.test(simulator)) throw new Error(`reader inputs need kebab-case names, got "${slug}" and "${simulator}"`);
  return `${READER_INPUTS_PREFIX}${slug}.${simulator}`;
}

// ---------------------------------------------------------------------------------------------
// Fields: each check returns the value as the simulator holds it, or undefined to drop it.

export type FieldCheck<T> = (raw: unknown) => T | undefined;
export type Shape = Record<string, FieldCheck<unknown>>;
export type InputsOf<S extends Shape> = { [K in keyof S]?: Exclude<ReturnType<S[K]>, undefined> };

/** "HH:MM" as a time field gives it, 00:00 to 23:59. */
export const clockField: FieldCheck<string> = (raw) =>
  typeof raw === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(raw) ? raw : undefined;

/** An amount as the reader typed it: a plain number of 0 or more (the field's own minimum). */
export const amountField: FieldCheck<string> = (raw) => {
  if (typeof raw !== "string" || !/^\d{1,7}(\.\d{1,4})?$/.test(raw)) return undefined;
  return Number.isFinite(Number(raw)) ? raw : undefined;
};

/** A week of seven days, each ticked or not. */
export const weekField: FieldCheck<boolean[]> = (raw) =>
  Array.isArray(raw) && raw.length === 7 && raw.every((day) => typeof day === "boolean") ? [...raw] : undefined;

/** One of the ids the simulator offers today. An id a correction removed is dropped. */
export const oneOfField = (ids: readonly string[]): FieldCheck<string> => (raw) =>
  typeof raw === "string" && ids.includes(raw) ? raw : undefined;

/** A set of on/off switches, all of them present (a half-remembered set is not the reader's). */
export const switchesField = (names: readonly string[]): FieldCheck<Record<string, boolean>> => (raw) => {
  if (!isRecord(raw)) return undefined;
  if (Object.keys(raw).length !== names.length || !names.every((name) => typeof raw[name] === "boolean")) return undefined;
  return Object.fromEntries(names.map((name) => [name, raw[name] as boolean]));
};

/** Picks among settings: each setting id maps to one of its option ids. A pick that no longer fits is dropped alone. */
export const picksField = (settings: readonly { id: string; options: readonly { id: string }[] }[]): FieldCheck<Record<string, string>> => (raw) => {
  if (!isRecord(raw)) return undefined;
  const kept: Record<string, string> = {};
  for (const setting of settings) {
    const pick = raw[setting.id];
    if (typeof pick === "string" && setting.options.some((option) => option.id === pick)) kept[setting.id] = pick;
  }
  return Object.keys(kept).length ? kept : undefined;
};

// ---------------------------------------------------------------------------------------------
// The shape each simulator keeps. A simulator with no entry here remembers nothing.

/** The decay kind (caffeine): when, bedtime, the reader's own amount. */
export const DECAY_INPUTS = { dose: clockField, bed: clockField, amount: amountField } satisfies Shape;
export type DecayInputs = InputsOf<typeof DECAY_INPUTS>;

/** The association-curve kind (steps): the days of the week the reader ticked. */
export const WEEK_INPUTS = { week: weekField } satisfies Shape;
export type WeekInputs = InputsOf<typeof WEEK_INPUTS>;

/** Turmeric's breakfast picker: one of the meals the trial served. */
export const mealInputs = (mealIds: readonly string[]) => ({ meal: oneOfField(mealIds) }) satisfies Shape;
export type MealInputs = { meal?: string };

/** Turmeric's first half hour (figure 2B): the pepper and turmeric switches, together. */
export const SWITCH_INPUTS = { picked: switchesField(["pepper", "turmeric"]) } satisfies Shape;
export type SwitchInputs = { picked?: { pepper: boolean; turmeric: boolean } };

/** HIIT's order flips (figure 4B): the reader's routine, one pick per setting. */
export const routineInputs = (settings: readonly { id: string; options: readonly { id: string }[] }[]) => ({ picks: picksField(settings) }) satisfies Shape;
export type RoutineInputs = { picks?: Record<string, string | undefined> };

/** What one simulator remembers: its storage name, the shape it keeps, the words of its clear control. */
export interface InputsPlan<S extends Shape = Shape> { name: string; shape: S; clear: string }

/** The kinds (drawn from a spec) that hold reader inputs. */
export const KIND_INPUTS = {
  decay: { name: "decay", shape: DECAY_INPUTS, clear: "Clear my numbers" },
  "association-curve": { name: "association-curve", shape: WEEK_INPUTS, clear: "Clear my days" },
} as const satisfies Record<string, InputsPlan>;

type Settings = { id: string; options: { id: string }[] }[];

/** The well-formed settings in a compare-bars simulator's params, or null. */
function settingsOf(params: Record<string, unknown> | undefined): Settings | null {
  const raw = params?.settings;
  if (!Array.isArray(raw)) return null;
  const settings = raw.filter((setting): setting is Settings[number] =>
    isRecord(setting) && typeof setting.id === "string" && Array.isArray(setting.options)
    && setting.options.every((option: unknown) => isRecord(option) && typeof option.id === "string"));
  return settings.length ? settings : null;
}

/**
 * The hand-drawn figures that hold reader inputs, by figure key, given the read's simulator
 * params where the figure needs them. Null: the figure remembers nothing.
 */
export function figureInputs(figureKey: string, simulator?: Record<string, unknown>): InputsPlan | null {
  const name = figureKey.split("/")[1] ?? "";
  if (figureKey === "turmeric-pepper-breakfast/first-half-hour") return { name, shape: SWITCH_INPUTS, clear: "Clear my choice" };
  if (figureKey === "hiit-body-composition/order-flips") {
    const settings = settingsOf(simulator);
    return settings ? { name, shape: routineInputs(settings), clear: "Clear my routine" } : null;
  }
  return null;
}

/** The hand-built simulators (by `simulator.kind`) that hold reader inputs. Null: it remembers nothing. */
export function simulatorInputs(kind: string, params: Record<string, unknown>): InputsPlan | null {
  if (kind === "breakfast-meals" && Array.isArray(params.meals)) {
    const ids = params.meals.flatMap((meal: unknown) => (isRecord(meal) && typeof meal.id === "string" ? [meal.id] : []));
    return ids.length ? { name: kind, shape: mealInputs(ids), clear: "Clear my choice" } : null;
  }
  return null;
}

/**
 * What a figure is handed so it can remember its inputs: the values and a way to change them
 * (a value or an updater, like React's setState). A figure without it keeps its own state, as
 * before. Figures import this type only; they never touch storage.
 */
export interface Remembered<V> {
  values: V;
  save: (next: V | ((now: V) => V)) => void;
}

// ---------------------------------------------------------------------------------------------
// Reading and writing.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Only the fields the shape names, each checked; everything else is dropped. */
export function checkInputs<S extends Shape>(raw: unknown, shape: S): InputsOf<S> {
  const out: Record<string, unknown> = {};
  if (!isRecord(raw)) return out as InputsOf<S>;
  for (const [name, check] of Object.entries(shape)) {
    if (!(name in raw)) continue;
    const value = check(raw[name]);
    if (value !== undefined) out[name] = value;
  }
  return out as InputsOf<S>;
}

/** The stored text to values: junk, another version or a value out of range gives nothing for that field. */
export function parseInputs<S extends Shape>(text: string | null, shape: S): InputsOf<S> {
  if (text === null || text.length > MAX_STORED) return {} as InputsOf<S>;
  let stored: unknown;
  try {
    stored = JSON.parse(text);
  } catch {
    return {} as InputsOf<S>;
  }
  if (!isRecord(stored) || stored.v !== READER_INPUTS_VERSION) return {} as InputsOf<S>;
  return checkInputs(stored.values, shape);
}

/** Values to the stored text, checked first. Null when nothing is left to keep. */
export function serialiseInputs<S extends Shape>(values: InputsOf<S> | Record<string, unknown>, shape: S): string | null {
  const kept = checkInputs(values, shape);
  return Object.keys(kept).length ? JSON.stringify({ v: READER_INPUTS_VERSION, values: kept }) : null;
}

function safeGet(storage: DeviceStorage | null, key: string): string | null {
  try {
    return storage ? storage.getItem(key) : null;
  } catch {
    return null;
  }
}

/** The keys of every remembered simulator in this storage. */
function storedKeys(storage: DeviceStorage | null): string[] {
  const keys: string[] = [];
  try {
    if (!storage) return keys;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(READER_INPUTS_PREFIX)) keys.push(key);
    }
  } catch {
    // Blocked storage lists nothing.
  }
  return keys;
}

/** Nothing typed: what the server renders, and what a cleared simulator holds. */
export const NO_INPUTS: Readonly<Record<string, never>> = Object.freeze({});

/** Whether a simulator holds anything the reader typed or picked. */
export const hasInputs = (values: Record<string, unknown>): boolean =>
  Object.values(values).some((value) => value !== undefined && value !== null && value !== "");

/**
 * The scratchpad: storage behind a copy in memory.
 *
 * The copy holds what the reader has typed on this visit, exactly as the simulator holds it, so
 * typing behaves as it always did (a field is never wiped mid-word because a half-typed value
 * fails its check). Storage holds only the checked values, so a reopened read gets back nothing
 * out of range. The copy also keeps a simulator working where storage refuses writes (some
 * private windows) and lets the page hear a change. Every touch of storage is in try/catch.
 */
export function createScratchpad(storage: () => DeviceStorage | null = deviceStorage) {
  const memory = new Map<string, Record<string, unknown>>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  function remove(key: string): void {
    try {
      storage()?.removeItem(key);
    } catch {
      // Blocked storage: the copy in memory is already empty, which is all this visit sees.
    }
  }

  return {
    /** The values for one simulator, as the page should see them now (the same object until they change). */
    read<S extends Shape>(key: string, shape: S): InputsOf<S> {
      let values = memory.get(key);
      if (values === undefined) {
        values = parseInputs(safeGet(storage(), key), shape);
        memory.set(key, values);
      }
      return values as InputsOf<S>;
    },
    /** Holds the values for this visit and saves the checked ones. False when storage refused. */
    write<S extends Shape>(key: string, shape: S, values: InputsOf<S> | Record<string, unknown>): boolean {
      memory.set(key, { ...values });
      const text = serialiseInputs(values, shape);
      let saved = true;
      try {
        const device = storage();
        if (!device) saved = false;
        else if (text === null) device.removeItem(key);
        else device.setItem(key, text);
      } catch {
        saved = false;
      }
      notify();
      return saved;
    },
    clear(key: string): void {
      memory.set(key, NO_INPUTS);
      remove(key);
      notify();
    },
    /** Forgets every remembered simulator on this device. Touches no other key (theme, ticks). */
    clearAll(): number {
      const keys = new Set(storedKeys(storage()));
      for (const [key, values] of memory) if (hasInputs(values)) keys.add(key);
      for (const key of keys) {
        memory.set(key, NO_INPUTS);
        remove(key);
      }
      notify();
      return keys.size;
    },
    /** How many simulators have something kept in storage. */
    stored(): number {
      return storedKeys(storage()).length;
    },
    /** Another tab changed storage: drop the copy so the next read sees it. Null means everything. */
    forget(key: string | null): void {
      if (key === null) memory.clear();
      else if (key.startsWith(READER_INPUTS_PREFIX)) memory.delete(key);
      else return;
      notify();
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type Scratchpad = ReturnType<typeof createScratchpad>;

/** The one scratchpad of this page. */
export const scratchpad: Scratchpad = createScratchpad();
