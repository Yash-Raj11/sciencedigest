import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueue, reconcile, type Write } from "../store/reduce";
import { RejectedWrite, pull, push } from "./remote";

// A stand-in for the database, holding step_amounts and step_checkins under the
// rules the real one enforces (20261113000100_habit_kinds.sql, checked against
// local Postgres): the key is (user_id, step_id, local_date); inserting an
// existing key is 23505 (HTTP 409); authenticated may UPDATE only amount, so an
// upsert that SETs the key columns is 42501; set_step_amount() upserts; the
// tick follows the amount.
const USER = "00000000-0000-4000-a000-000000000001";
const WATER = "31000000-0000-4000-a000-000000000001";
const TODAY = "2026-11-12";
const TARGET = 3;

type Reply = { data: unknown; error: { code: string; message: string } | null };

function fakeDatabase() {
  const amounts = new Map<string, number>();
  const ticks = new Set<string>();
  const requests: { call: string; status: number }[] = [];
  const key = (stepId: string, date: string) => `${stepId}|${date}`;
  const follow = (stepId: string, date: string) => {
    const amount = amounts.get(key(stepId, date)) ?? 0;
    if (amount >= TARGET) ticks.add(key(stepId, date));
    else ticks.delete(key(stepId, date));
  };
  const reply = (call: string, status: number, error: Reply["error"] = null, data: unknown = null): Reply => {
    requests.push({ call, status });
    return { data, error };
  };
  const conflict = { code: "23505", message: 'duplicate key value violates unique constraint "step_amounts_pkey"' };

  // A query builder: every filter returns itself, awaiting it runs the request.
  function table(name: string) {
    let run: (() => Reply) | null = null; // a write waiting to be sent; null means a read
    const filters: Record<string, unknown> = {};
    const builder = {
      select() { return builder; },
      is() { return builder; },
      gte() { return builder; },
      order() { return builder; },
      limit() { return builder; },
      eq(column: string, value: unknown) { filters[column] = value; return builder; },
      insert(row: { step_id: string; local_date: string; amount: number }) {
        run = () => {
          if (name !== "step_amounts") return reply(`insert ${name}`, 201);
          if (amounts.has(key(row.step_id, row.local_date))) return reply("insert step_amounts", 409, conflict);
          amounts.set(key(row.step_id, row.local_date), row.amount);
          follow(row.step_id, row.local_date);
          return reply("insert step_amounts", 201);
        };
        return builder;
      },
      update(patch: { amount?: number }) {
        run = () => {
          const k = key(filters.step_id as string, filters.local_date as string);
          if (name === "step_amounts" && amounts.has(k) && patch.amount !== undefined) {
            amounts.set(k, patch.amount);
            follow(filters.step_id as string, filters.local_date as string);
          }
          return reply(`update ${name}`, 204);
        };
        return builder;
      },
      upsert() {
        // PostgREST SETs every column sent, key columns included: refused by the column grant.
        run = () => reply(`upsert ${name}`, 403, { code: "42501", message: `permission denied for table ${name}` });
        return builder;
      },
      then<T>(resolve: (value: Reply) => T) {
        if (run) return Promise.resolve(resolve(run()));
        if (name === "step_amounts") {
          return Promise.resolve(resolve(reply("select step_amounts", 200, null,
            [...amounts].map(([k, amount]) => ({ step_id: k.split("|")[0], local_date: k.split("|")[1], amount })))));
        }
        if (name === "step_checkins") {
          return Promise.resolve(resolve(reply("select step_checkins", 200, null,
            [...ticks].map((k) => ({ step_id: k.split("|")[0], local_date: k.split("|")[1] })))));
        }
        return Promise.resolve(resolve(reply(`select ${name}`, 200, null, [])));
      },
    };
    return builder;
  }

  const db = {
    from: table,
    async rpc(fn: string, args: { p_step_id: string; p_local_date: string; p_amount: number }) {
      if (fn !== "set_step_amount") return reply(`rpc ${fn}`, 404, { code: "PGRST202", message: `Could not find the function public.${fn}` });
      amounts.set(key(args.p_step_id, args.p_local_date), args.p_amount);
      follow(args.p_step_id, args.p_local_date);
      return reply("rpc set_step_amount", 204);
    },
  };
  return { db: db as unknown as SupabaseClient, amounts, ticks, requests };
}

const amountWrite = (amount: number): Write => ({ op: "amount", stepId: WATER, localDate: TODAY, amount, needed: TARGET });

describe("push() for an amount", () => {
  it("two amount writes for the same habit and day: one upsert each, no 409, the second amount wins", async () => {
    const server = fakeDatabase();

    await push(server.db, USER, amountWrite(1));
    await push(server.db, USER, amountWrite(2));

    expect(server.requests.filter((r) => r.status >= 400), "no request may fail").toEqual([]);
    expect(server.requests.map((r) => r.call)).toEqual(["rpc set_step_amount", "rpc set_step_amount"]);
    expect(server.amounts.get(`${WATER}|${TODAY}`)).toBe(2);
  });

  it("a replay after reconcile: the same write sent again is accepted, and the newer one still wins", async () => {
    const server = fakeDatabase();
    let queue = enqueue([], amountWrite(3));

    // Sent and saved, but the reply was lost: the write is still in the queue.
    await push(server.db, USER, queue[0]!);
    const data = reconcile(await pull(server.db, USER, TODAY), queue);
    expect(data.amounts[TODAY]?.[WATER]).toBe(3);
    expect(data.ticks[TODAY]).toEqual([WATER]);

    // The retry sends it again, then a newer tap (−1) follows.
    await push(server.db, USER, queue[0]!);
    queue = enqueue(queue.slice(1), amountWrite(2));
    await push(server.db, USER, queue[0]!);

    expect(server.requests.filter((r) => r.status >= 400), "no request may fail").toEqual([]);
    expect(server.amounts.get(`${WATER}|${TODAY}`)).toBe(2);
    expect(server.ticks.has(`${WATER}|${TODAY}`), "below the target the tick goes").toBe(false);
  });
});

describe("push() never treats a conflict as refused forever", () => {
  // A database that answers every write with the same error.
  function failingWith(code: string, message: string) {
    const answer = async () => ({ data: null, error: { code, message } });
    const builder: Record<string, unknown> = {};
    for (const method of ["insert", "update", "upsert", "delete", "eq"]) builder[method] = () => builder;
    builder.then = (resolve: (v: unknown) => unknown) => answer().then(resolve);
    return { from: () => builder, rpc: answer } as unknown as SupabaseClient;
  }

  it("a 409 (23505) on an amount keeps the write: the error is retryable, never RejectedWrite", async () => {
    const attempt = push(failingWith("23505", "duplicate key value violates unique constraint"), USER, amountWrite(1));
    await expect(attempt).rejects.toThrow();
    await expect(attempt).rejects.not.toBeInstanceOf(RejectedWrite);
  });

  it("a function the server does not have yet (PGRST202: the app deployed before the migration) is retryable", async () => {
    const attempt = push(failingWith("PGRST202", "Could not find the function public.set_step_amount"), USER, amountWrite(1));
    await expect(attempt).rejects.toThrow();
    await expect(attempt).rejects.not.toBeInstanceOf(RejectedWrite);
  });

  it("a write the database refuses on its merits (23514: a tick-off habit takes no amount) is RejectedWrite", async () => {
    const attempt = push(failingWith("23514", "step is a tick-off habit and takes no amount"), USER, amountWrite(1));
    await expect(attempt).rejects.toBeInstanceOf(RejectedWrite);
  });
});
