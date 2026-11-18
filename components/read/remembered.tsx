"use client";

/**
 * The read's side of "reader inputs on the device only" (docs/SIMULATORS.md e): a hook that hands
 * a simulator what the reader typed last time, and the quiet control that forgets it. The storage
 * itself is lib/reader-inputs.ts (pure); figures get the values as props and never touch storage.
 *
 * The server renders every simulator empty (it cannot see this device); the remembered values
 * arrive on the first render after the page loads. Nothing here goes to the server or the store.
 */

import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import {
  NO_INPUTS, hasInputs, inputsKey, scratchpad, type InputsOf, type InputsPlan, type Remembered, type Shape,
} from "@/lib/reader-inputs";

let listening = false;

/** Hears this tab's writes and, through the storage event, another tab's. */
function subscribe(listener: () => void): () => void {
  if (!listening && typeof window !== "undefined") {
    window.addEventListener("storage", (event) => scratchpad.forget(event.key));
    listening = true;
  }
  return scratchpad.subscribe(listener);
}

/**
 * The remembered inputs of one simulator on one read. `shape` must be the same object on every
 * render (a module constant, or memoised on the read's params).
 */
export function useRemembered<S extends Shape>(slug: string, simulator: string, shape: S): Remembered<InputsOf<S>> & { clear: () => void; any: boolean } {
  const key = inputsKey(slug, simulator);
  const values = useSyncExternalStore(subscribe, () => scratchpad.read(key, shape), () => NO_INPUTS as InputsOf<S>);
  const save = useCallback(
    (next: InputsOf<S> | ((now: InputsOf<S>) => InputsOf<S>)) => {
      scratchpad.write(key, shape, typeof next === "function" ? next(scratchpad.read(key, shape)) : next);
    },
    [key, shape],
  );
  const clear = useCallback(() => scratchpad.clear(key), [key]);
  return { values, save, clear, any: hasInputs(values) };
}

/** How many simulators have something kept on this device (0 on the server). */
export function useStoredInputs(): number {
  return useSyncExternalStore(subscribe, () => scratchpad.stored(), () => 0);
}

/** Forgets every simulator's inputs on this device. */
export const clearAllInputs = (): number => scratchpad.clearAll();

/**
 * The quiet control by a simulator: shown once the reader has typed or picked something, so a
 * reopened read says why its answers are already there. `label` names what is cleared, in the
 * simulator's own words ("Clear my numbers", "Clear my days").
 */
export function ClearInputs({ remembered, label, className = "" }: { remembered: { any: boolean; clear: () => void }; label: string; className?: string }) {
  if (!remembered.any) return null;
  return (
    <p className={`flex flex-wrap items-center gap-x-3 text-sm leading-snug text-muted ${className}`} data-remembered>
      <span>Kept on this device only.</span>
      <button type="button" onClick={remembered.clear} className="min-h-11 font-medium text-ink underline underline-offset-4" data-clear-inputs>
        {label}
      </button>
    </p>
  );
}

/**
 * A figure or a hand-built simulator that holds input: `children` draws it with the remembered
 * values, and the clear control follows it.
 */
export function Remembering({ slug, plan, clearClassName, children }: {
  slug: string; plan: InputsPlan; clearClassName?: string;
  children: (remembered: Remembered<Record<string, unknown>>) => ReactNode;
}) {
  const remembered = useRemembered(slug, plan.name, plan.shape);
  return (
    <>
      {children(remembered)}
      <ClearInputs remembered={remembered} label={plan.clear} className={clearClassName} />
    </>
  );
}
