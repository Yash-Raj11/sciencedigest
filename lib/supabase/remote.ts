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

const PERMANENT = /^(22|23|42|P0|PGRST1|PGRST2)/;
const UNIQUE_VIOLATION = "23505";

function check(error: { code?: string; message: string } | null, tolerate: string[] = []): void {
  if (!error) return;
  if (error.code && tolerate.includes(error.code)) return;
  if (error.code && PERMANENT.test(error.code)) throw new RejectedWrite(`${error.code}: ${error.message}`);
  throw new Error(error.message);
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
      // The database keeps the tick in step with the amount (see the habit_kinds migration).
      const row = { user_id: userId, step_id: write.stepId, local_date: write.localDate, amount: write.amount };
      const { error } = await db.from("step_amounts").insert(row);
      if (error?.code === UNIQUE_VIOLATION) {
        const again = await db.from("step_amounts").update({ amount: write.amount })
          .eq("user_id", userId).eq("step_id", write.stepId).eq("local_date", write.localDate);
        return check(again.error);
      }
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
