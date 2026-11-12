/**
 * supabase/seed.sql reaches the hosted project (`supabase db push --remote
 * --include-seed`), so it may hold reference content only: papers, their reads,
 * feature content and protocol steps. It must never write anyone's account,
 * ticks, amounts or protocols, and never make anyone a member.
 *
 * Local test data that looks like real users lives in
 * supabase/tests/local/background_users.sql, which only `npm run db:test:local`
 * loads. These tests also make sure config.toml never lists that file (or
 * anything else) as a seed.
 *
 * To check a different file (for example to see this test fail):
 *   SEED_SQL_PATH=/path/to/file.sql npx vitest run scripts/seed-safety.test.ts
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SEED_PATH = process.env.SEED_SQL_PATH ?? "supabase/seed.sql";
const CONFIG_PATH = "supabase/config.toml";

const USER_TABLES = [
  "user_profiles",
  "step_checkins",
  "step_amounts",
  "equipped_protocols",
  "user_program_state",
];

// Any statement that writes to auth.users or to a user table, schema-qualified
// or not, quoted or not.
const WRITE = String.raw`(?:insert\s+into|update|delete\s+from|truncate(?:\s+table)?|copy|merge\s+into)\s+(?:only\s+)?`;
const USER_TABLE = String.raw`(?:"?auth"?\s*\.\s*"?users"?|(?:"?public"?\s*\.\s*)?"?(?:${USER_TABLES.join("|")})"?)`;
// The table name must end there: "step_checkins;" counts, "step_checkins_x" does not.
const USER_WRITE = new RegExp(String.raw`\b${WRITE}${USER_TABLE}(?![\w.])`, "gi");

/** Drop whole-line SQL comments; leave string contents (paper text) alone. */
function withoutLineComments(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
}

function userDataWrites(sql: string): string[] {
  return [...withoutLineComments(sql).matchAll(USER_WRITE)].map((m) => m[0].replace(/\s+/g, " "));
}

describe(`seed file (${SEED_PATH})`, () => {
  const seed = readFileSync(SEED_PATH, "utf8");

  it("writes no user data: auth.users, profiles, ticks, amounts, protocols, program state", () => {
    expect(userDataWrites(seed)).toEqual([]);
  });

  it("never mentions subscription_tier, so it cannot make anyone a member", () => {
    expect(withoutLineComments(seed)).not.toMatch(/subscription_tier/i);
  });

  it("includes no other file (no \\i or \\ir)", () => {
    expect(seed).not.toMatch(/^\s*\\i[r]?\s/m);
  });
});

describe("the check itself", () => {
  // So that a passing run above means something: each of these must be caught.
  it.each([
    ["insert into auth.users (id) values ('x');"],
    ["insert into public.step_checkins (user_id) values ('x');"],
    ["INSERT INTO step_amounts (user_id) values ('x');"],
    ['update "public"."user_profiles" set timezone = \'UTC\';'],
    ["delete from public.equipped_protocols;"],
    ["insert into public.user_program_state (user_id) values ('x');"],
  ])("catches %s", (sql) => {
    expect(userDataWrites(sql)).toHaveLength(1);
  });

  it("does not flag reference content or a commented-out line", () => {
    expect(
      userDataWrites(
        "insert into public.papers (id) values ('x');\n" +
          "-- insert into public.step_checkins would be wrong here\n" +
          "insert into public.protocol_steps (id) values ('y');",
      ),
    ).toEqual([]);
  });
});

describe(`seed paths in ${CONFIG_PATH}`, () => {
  it("are exactly ./seed.sql, so background_users.sql can never be pushed", () => {
    const config = readFileSync(CONFIG_PATH, "utf8");
    const seedSection = config.split(/^\[db\.seed\]\s*$/m)[1]?.split(/^\[/m)[0] ?? "";
    const paths = seedSection.match(/^\s*sql_paths\s*=\s*(\[.*\])\s*$/m)?.[1];
    expect(paths && JSON.parse(paths)).toEqual(["./seed.sql"]);
  });
});
