/**
 * Everything the app says to the database, in one file.
 *
 * `push` sends one write. `pull` reads back the user's whole tracked state.
 * Row level security (see supabase/migrations) decides what is allowed; this
 * file never checks permissions itself, because a check in the browser is a
 * suggestion, not a control.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "../dates";
import type { Data, Write } from "../store/reduce";

/** Thrown for a write the server will never accept, so retrying is pointless. */
export class RejectedWrite extends Error {}

/**
 * Thrown when the server answered this one write with a "wait for a fix" code
 * (see RETRY). It is never dropped. sync.ts counts these answers and, after a
 * few in a row, sets the write aside so it cannot hold up the rest.
 */
export class StuckWrite extends Error {
  constructor(readonly code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "StuckWrite";
  }
}

/** The write itself breaks a rule: a bad value (22), a broken constraint (23), a guard (42, P0), a malformed request (PGRST1). */
const PERMANENT = /^(22|23|42|P0|PGRST1)/;
/**
 * Never refused forever, so never dropped. A conflict (23505, HTTP 409) means
 * the row is already there: where that counts as saved it is tolerated below,
 * anywhere else it is a fault in how we write, and the write waits for a fix.
 * A missing function or table (42883, 42P01, PGRST2xx) means the app is newer
 * than the database (deployed before its migration); the write waits for it.
 * These are thrown as StuckWrite, so the queue can tell "the server refused
 * this write for now" from "the server could not be reached".
 */
const RETRY = /^(23505|42883|42P01|PGRST2)/;
const UNIQUE_VIOLATION = "23505";

function check(error: { code?: string; message: string } | null, tolerate: string[] = []): void {
  if (!error) return;
  if (error.code && tolerate.includes(error.code)) return;
  if (error.code && RETRY.test(error.code)) throw new StuckWrite(error.code, error.message);
  if (error.code && PERMANENT.test(error.code)) throw new RejectedWrite(`${error.code}: ${error.message}`);
  throw new Error(error.code ? `${error.code}: ${error.message}` : error.message);
}

export async function push(db: SupabaseClient, userId: string, write: Write): Promise<void> {
  switch (write.op) {
    case "tick": {
      const { error } = await db.from("step_checkins").insert({ user_id: userId, step_id: write.stepId, local_date: write.localDate });
      return check(error, [UNIQUE_VIOLATION]);
    }
    case "untick": {
      const { error } = await db.from("step_checkins").delete()
        .eq("user_id", userId).eq("step_id", write.stepId).eq("local_date", write.localDate);
      return check(error);
    }
    case "equip": {
      // Insert, or if the row exists, re-equip it. Not an upsert: the user may
      // only update three columns, and an upsert would try to set them all.
      const { error } = await db.from("equipped_protocols")
        .insert({ user_id: userId, paper_id: write.paperId, last_active_on: write.localDate });
      if (error?.code === UNIQUE_VIOLATION) {
        const again = await db.from("equipped_protocols")
          .update({ unequipped_at: null, last_active_on: write.localDate, equipped_at: new Date().toISOString() })
          .eq("user_id", userId).eq("paper_id", write.paperId);
        return check(again.error);
      }
      return check(error);
    }
    case "unequip": {
      const { error } = await db.from("equipped_protocols").update({ unequipped_at: new Date().toISOString() })
        .eq("user_id", userId).eq("paper_id", write.paperId);
      return check(error);
    }
    case "program": {
      const { error } = await db.from("user_program_state").upsert({
        user_id: userId, paper_id: write.paperId, block_started_at: write.blockStartedAt,
        choices: write.choices, updated_at: new Date().toISOString(),
      });
      return check(error);
    }
    case "amount": {
      // One upsert on the real key (user_id, step_id, local_date), so a second
      // +1 on the same day, or a replay, never conflicts. A function because
      // the column grant forbids the upsert PostgREST would build; the user is
      // auth.uid() inside it. The database keeps the tick in step with the
      // amount. See 20261114000100_set_step_amount.sql.
      const { error } = await db.rpc("set_step_amount", {
        p_step_id: write.stepId, p_local_date: write.localDate, p_amount: write.amount,
      });
      return check(error);
    }
    case "habit_add": {
      const { error } = await db.from("protocol_steps").insert({
        id: write.id, owner_id: userId, position: write.position, label: write.label,
        habit_kind: write.kind ?? "check", unit: write.unit ?? null, daily_target: write.target ?? null,
      });
      return check(error, [UNIQUE_VIOLATION]);
    }
    case "habit_update": {
      const patch: Record<string, unknown> = {};
      if (write.label !== undefined) patch.label = write.label;
      if (write.retired !== undefined) patch.retired_at = write.retired ? new Date().toISOString() : null;
      const { error } = await db.from("protocol_steps").update(patch).eq("id", write.id).eq("owner_id", userId);
      return check(error);
    }
  }
}

export const HISTORY_DAYS = 400;

export async function pull(db: SupabaseClient, userId: string, today: string): Promise<Data> {
  const since = addDays(today, -HISTORY_DAYS);
  const [equipped, program, habits, checkins, amountRows] = await Promise.all([
    db.from("equipped_protocols").select("paper_id, last_active_on").eq("user_id", userId).is("unequipped_at", null),
    db.from("user_program_state").select("paper_id, block_started_at, choices").eq("user_id", userId),
    db.from("protocol_steps").select("id, label, position, retired_at, habit_kind, unit, daily_target").eq("owner_id", userId).order("position"),
    db.from("step_checkins").select("step_id, local_date").eq("user_id", userId).gte("local_date", since).limit(20000),
    db.from("step_amounts").select("step_id, local_date, amount").eq("user_id", userId).gte("local_date", since).limit(20000),
  ]);
  for (const result of [equipped, program, habits, checkins, amountRows]) if (result.error) throw new Error(result.error.message);

  const ticks: Data["ticks"] = {};
  for (const row of checkins.data ?? []) (ticks[row.local_date] ??= []).push(row.step_id);

  const amounts: Data["amounts"] = {};
  for (const row of amountRows.data ?? []) (amounts[row.local_date] ??= {})[row.step_id] = row.amount;

  return {
    amounts,
    equipped: (equipped.data ?? []).map((r) => ({ paperId: r.paper_id, since: r.last_active_on })),
    ticks,
    program: Object.fromEntries((program.data ?? []).map((r) => [
      r.paper_id, { blockStartedAt: r.block_started_at, choices: (r.choices ?? {}) as Record<string, string> },
    ])),
    habits: (habits.data ?? []).map((r) => ({
      id: r.id, label: r.label, position: r.position, retired: r.retired_at !== null,
      kind: r.habit_kind, unit: r.unit, target: r.daily_target,
    })),
  };
}

export async function fetchProfile(db: SupabaseClient, userId: string): Promise<{ tier: "free" | "premium"; timezone: string } | null> {
  const { data, error } = await db.from("user_profiles").select("subscription_tier, timezone").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  return { tier: data.subscription_tier, timezone: data.timezone };
}
