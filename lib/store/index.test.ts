import { beforeAll, describe, expect, it } from "vitest";
import type { HeldWrite, Write } from "./reduce";

// The real store, saving to a stand-in for the browser's storage, so this
// reads exactly what a reload would find on the device.
const saved = new Map<string, string>();
beforeAll(() => {
  globalThis.localStorage = {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => void saved.set(key, value),
    removeItem: (key: string) => void saved.delete(key),
  } as Storage;
});

describe("what is saved on the device", () => {
  it("held writes are saved with the queue, so a reload cannot lose them", async () => {
    const { STORAGE_KEY, store } = await import("./index");
    const water: Write = { op: "amount", stepId: "water", localDate: "2026-11-13", amount: 3, needed: 12 };
    const held: HeldWrite[] = [{ write: water, code: "PGRST202", since: "2026-11-13T08:00:00.000Z" }];
    store.setState({ held, queue: [{ op: "tick", stepId: "walk", localDate: "2026-11-13" }] });

    const onDevice = JSON.parse(saved.get(STORAGE_KEY) ?? "{}");
    expect(onDevice.version).toBe(3);
    expect(onDevice.state.held).toEqual(held);
    expect(onDevice.state.queue).toHaveLength(1);
  });

  it("a tap on a habit with a held write joins the held list, not the queue", async () => {
    const { store } = await import("./index");
    store.setState({ queue: [] });
    store.getState().dispatch({ op: "amount", stepId: "water", localDate: "2026-11-13", amount: 4, needed: 12 });
    expect(store.getState().queue).toEqual([]);
    expect(store.getState().held.map((h) => h.write)).toEqual([{ op: "amount", stepId: "water", localDate: "2026-11-13", amount: 4, needed: 12 }]);
    expect(store.getState().data.amounts["2026-11-13"]).toEqual({ water: 4 }); // the screen shows it at once
  });
});
