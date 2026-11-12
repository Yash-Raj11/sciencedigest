/**
 * Generates supabase/tests/database/90_parity.generated.test.sql.
 *
 *   npm run parity:gen
 *
 * It invents 40 random-but-reproducible users (fixed seed), works out each
 * one's score with lib/score.ts, and writes a pgTAP test that loads the same
 * data into Postgres and asserts public.compute_adherence() and
 * public.compute_streak() return exactly the same answer.
 *
 * Two failure modes, two alarms:
 *   - score.ts changed, file not regenerated  -> `npm test` fails (parity.test.ts)
 *   - file regenerated, SQL not updated       -> `npm run db:test` fails
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { addDays } from "../lib/dates";
import { EVIDENCE_GRADES, type EvidenceGrade } from "../lib/evidence";
import { score, streak, type ProgramState, type ScoreInput, type Step } from "../lib/score";

export const PARITY_PATH = fileURLToPath(
  new URL("../supabase/tests/database/90_parity.generated.test.sql", import.meta.url),
);
const SCENARIOS = 40;
const SEED = 20261112;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Row {
  step: Step;
  position: number;
  retired: boolean;
  ownerId: string | null;
}

interface Scenario {
  userId: string;
  today: string;
  papers: { id: string; state: "active" | "dormant" | "unequipped" | "withdrawn"; lastActiveOn: string }[];
  rows: Row[];
  programState: Record<string, ProgramState>;
  checkins: { stepId: string; localDate: string }[];
}

function build(): Scenario[] {
  const rand = mulberry32(SEED);
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const pick = <T,>(items: readonly T[]): T => items[int(0, items.length - 1)];
  const chance = (p: number) => rand() < p;
  let counter = 0;
  const uuid = (prefix: string) => `${prefix}0000000-0000-4000-8000-${(++counter).toString(16).padStart(12, "0")}`;

  const scenarios: Scenario[] = [];
  for (let n = 0; n < SCENARIOS; n += 1) {
    const today = addDays("2026-11-09", n % 7);
    const userId = uuid("a");
    const scenario: Scenario = { userId, today, papers: [], rows: [], programState: {}, checkins: [] };

    for (let p = 0; p < int(0, 4); p += 1) {
      const paperId = uuid("b");
      const roll = rand();
      const state = roll < 0.62 ? "active" : roll < 0.8 ? "dormant" : roll < 0.9 ? "unequipped" : "withdrawn";
      const lastActiveOn = addDays(today, state === "dormant" ? -int(8, 15) : -int(0, 7));
      scenario.papers.push({ id: paperId, state, lastActiveOn });

      let position = 0;
      const actions: Step[] = [];
      const appliesWhen = (): Record<string, string> | null =>
        chance(0.3) ? (chance(0.5) ? { modality: pick(["cycling", "running"]) } : { track: "on" }) : null;

      for (let s = 0; s < int(1, 3); s += 1) {
        const step: Step = { id: uuid("c"), paperId, kind: "action", grade: pick(EVIDENCE_GRADES), appliesWhen: appliesWhen() };
        actions.push(step);
        scenario.rows.push({ step, position: (position += 1), retired: chance(0.12), ownerId: null });
      }
      for (let s = 0; s < int(0, 2); s += 1) {
        const step: Step = {
          id: uuid("c"), paperId, kind: "weekly_target", grade: pick(EVIDENCE_GRADES),
          targetPerWeek: int(1, 4), countsStepId: pick(actions).id, appliesWhen: appliesWhen(),
        };
        scenario.rows.push({ step, position: (position += 1), retired: chance(0.12), ownerId: null });
      }
      for (let s = 0; s < int(0, 2); s += 1) {
        const weeks = chance(0.5);
        const step: Step = {
          id: uuid("c"), paperId, kind: "condition", grade: pick(EVIDENCE_GRADES),
          conditionKey: weeks ? "block_weeks_gte" : "modality_is",
          conditionValue: weeks ? { weeks: int(1, 10) } : { modality: pick(["cycling", "running"]) },
          appliesWhen: appliesWhen(),
        };
        scenario.rows.push({ step, position: (position += 1), retired: chance(0.12), ownerId: null });
      }

      if (chance(0.65)) {
        const choices: Record<string, string> = {};
        if (chance(0.7)) choices.modality = pick(["cycling", "running"]);
        if (chance(0.5)) choices.track = "on";
        scenario.programState[paperId] = {
          blockStartedAt: chance(0.75) ? addDays(today, -int(0, 90)) : null,
          choices,
        };
      }
    }

    for (let h = 0; h < int(0, 3); h += 1) {
      const step: Step = { id: uuid("d"), paperId: null, kind: "action", grade: "none" };
      scenario.rows.push({ step, position: h + 1, retired: chance(0.2), ownerId: userId });
    }

    for (const { step } of scenario.rows) {
      if (step.kind !== "action") continue;
      for (let back = 0; back < 14; back += 1) {
        if (chance(0.4)) scenario.checkins.push({ stepId: step.id, localDate: addDays(today, -back) });
      }
    }

    scenarios.push(scenario);
  }
  return scenarios;
}

function toInput(s: Scenario): ScoreInput {
  const live = new Set(s.papers.filter((p) => p.state === "active" || p.state === "dormant").map((p) => p.id));
  return {
    today: s.today,
    equipped: s.papers.filter((p) => live.has(p.id)).map((p) => ({ paperId: p.id, lastActiveOn: p.lastActiveOn })),
    steps: s.rows.filter((r) => !r.retired && (r.step.paperId === null || live.has(r.step.paperId))).map((r) => r.step),
    checkins: s.checkins,
    programState: s.programState,
  };
}

const q = (value: string | null | undefined) => (value == null ? "null" : `'${value.replace(/'/g, "''")}'`);
const j = (value: unknown) => (value == null ? "null" : `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`);
const sourceFor = (grade: EvidenceGrade) => (grade === "none" ? "null" : "'estimate'");

export function buildParitySql(): string {
  const scenarios = build();
  const out: string[] = [
    "-- GENERATED by scripts/gen-parity.mts. Do not edit by hand: run `npm run parity:gen`.",
    "--",
    `-- ${SCENARIOS} random users (seed ${SEED}). For each one, lib/score.ts worked out the expected`,
    "-- answer below; this file asserts the SQL mirror returns exactly the same JSON.",
    "",
    "begin;",
    `select plan(${SCENARIOS * 2});`,
    "",
    "-- History older than a week is needed, so the date-window guard is off for this transaction only.",
    "alter table public.step_checkins disable trigger step_checkins_guard;",
    "",
  ];

  for (const [index, s] of scenarios.entries()) {
    out.push(`-- scenario ${index + 1}: today ${s.today}, ${s.papers.length} paper(s)`);
    out.push(`insert into auth.users (id, email) values (${q(s.userId)}, 'parity-${index + 1}@example.test');`);

    for (const [p, paper] of s.papers.entries()) {
      out.push(
        `insert into public.papers (id, slug, title, doi, category, teaser, published_at, withdrawn_at) values (${q(paper.id)}, 'parity-${index + 1}-${p + 1}', 'Parity paper', '10.0000/parity.${index + 1}.${p + 1}', 'test', 'Teaser', now(), ${paper.state === "withdrawn" ? "now()" : "null"});`,
      );
    }

    const ordered = [...s.rows].sort((a, b) => Number(a.step.kind !== "action") - Number(b.step.kind !== "action"));
    for (const { step, position, retired, ownerId } of ordered) {
      out.push(
        `insert into public.protocol_steps (id, paper_id, owner_id, position, label, kind, evidence_grade, source_estimate, target_per_week, counts_step_id, condition_key, condition_value, applies_when, retired_at) values (${q(step.id)}, ${q(step.paperId)}, ${q(ownerId)}, ${position}, 'step', '${step.kind}', '${step.grade}', ${sourceFor(step.grade)}, ${step.targetPerWeek ?? "null"}, ${q(step.countsStepId)}, ${q(step.conditionKey)}, ${j(step.conditionValue)}, ${j(step.appliesWhen)}, ${retired ? "now()" : "null"});`,
      );
    }

    for (const paper of s.papers) {
      out.push(
        `insert into public.equipped_protocols (user_id, paper_id, last_active_on, unequipped_at) values (${q(s.userId)}, ${q(paper.id)}, ${q(paper.lastActiveOn)}, ${paper.state === "unequipped" ? "now()" : "null"});`,
      );
    }
    for (const [paperId, state] of Object.entries(s.programState)) {
      out.push(
        `insert into public.user_program_state (user_id, paper_id, block_started_at, choices) values (${q(s.userId)}, ${q(paperId)}, ${q(state.blockStartedAt)}, ${j(state.choices)});`,
      );
    }
    if (s.checkins.length > 0) {
      out.push(
        `insert into public.step_checkins (user_id, step_id, local_date) values ${s.checkins.map((c) => `(${q(s.userId)}, ${q(c.stepId)}, ${q(c.localDate)})`).join(", ")};`,
      );
    }
    // The tick trigger moves last_active_on forward; pin it back to the fixture's value.
    for (const paper of s.papers) {
      out.push(
        `update public.equipped_protocols set last_active_on = ${q(paper.lastActiveOn)} where user_id = ${q(s.userId)} and paper_id = ${q(paper.id)};`,
      );
    }

    const input = toInput(s);
    const r = score(input);
    const expected = {
      pct: r.pct, earned: r.earned, possible: r.possible,
      per_paper: r.perPaper, dormant: r.dormant, satisfied: r.satisfied, consistency: r.consistency,
    };
    out.push(
      `select is(public.compute_adherence(${q(s.userId)}, ${q(s.today)}), ${j(expected)}, 'scenario ${index + 1}: adherence matches lib/score.ts (${r.pct}%)');`,
    );
    const expectedStreak = streak(s.checkins.map((c) => c.localDate), s.today);
    out.push(
      `select is(public.compute_streak(${q(s.userId)}, ${q(s.today)}), ${expectedStreak}, 'scenario ${index + 1}: streak matches lib/score.ts (${expectedStreak})');`,
      "",
    );
  }

  out.push("select * from finish();", "rollback;", "");
  return out.join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sql = buildParitySql();
  writeFileSync(PARITY_PATH, sql);
  console.log(`wrote ${PARITY_PATH} (${SCENARIOS} scenarios, ${SCENARIOS * 2} assertions)`);
}
