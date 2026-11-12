/**
 * Phase 8 gate, checks (b) and (c), against the LIVE database, without a browser
 * (Cloudflare Turnstile refuses automated browsers, and it must not be worked around).
 *
 *   Run by the owner, in their own Terminal, never by an assistant session:
 *     read -s SUPABASE_SERVICE_ROLE_KEY && export SUPABASE_SERVICE_ROLE_KEY   (typed, not shown, not saved)
 *     npx tsx scripts/gate-rls-live.mts
 *     unset SUPABASE_SERVICE_ROLE_KEY
 *
 * What it does on production:
 *   1. Creates two test users with the auth admin API (addresses under .invalid, which cannot
 *      receive mail). Each signs in through a one-time admin link, which needs no CAPTCHA.
 *   2. As user A: adds one habit and ticks it (the same two writes the app sends).
 *   3. (b) As user B: reads step_checkins three ways. Must get none of A's rows.
 *   4. (c) As user A (free tier): asks for paper_content of hiit-body-composition. Must get no
 *      row. A free paper must return one, to show the question itself works.
 *   5. Deletes both users, always, even if a check failed, and confirms their rows are gone.
 *
 * It prints no ids, no tokens and never the key. Exit code 0 only if every check passed.
 */

import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MEMBERS_SLUG = "hiit-body-composition";

if (!URL_ || !ANON) throw new Error("NEXT_PUBLIC_SUPABASE_URL and the anon key must be in .env.local.");
if (!SERVICE) throw new Error("Export SUPABASE_SERVICE_ROLE_KEY in this Terminal first. It is read from the environment only.");

let failed = 0;
function check(name: string, ok: boolean, detail: string): void {
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${detail}`);
}

async function call(path: string, key: string, token: string, init: RequestInit = {}): Promise<{ status: number; body: unknown }> {
  const response = await fetch(URL_ + path, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await response.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: response.status, body };
}
const admin = (path: string, init?: RequestInit) => call(path, SERVICE!, SERVICE!, init);
const rows = (result: { body: unknown }) => (Array.isArray(result.body) ? (result.body as Record<string, unknown>[]) : []);

interface TestUser { id: string; token: string; createdAt: string }

async function createUser(label: string): Promise<TestUser> {
  const email = `sd-gate-${label}-${randomBytes(6).toString("hex")}@science-digest-gate.invalid`;
  const created = await admin("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password: randomBytes(24).toString("base64url"), email_confirm: true }) });
  const user = created.body as { id?: string; created_at?: string };
  if (created.status >= 300 || !user.id) throw new Error(`could not create test user ${label}: HTTP ${created.status}`);
  try {
    const link = await admin("/auth/v1/admin/generate_link", { method: "POST", body: JSON.stringify({ type: "magiclink", email }) });
    const hashed = (link.body as { hashed_token?: string }).hashed_token;
    if (!hashed) throw new Error(`could not make a sign-in link for test user ${label}: HTTP ${link.status}`);
    const session = await call("/auth/v1/verify", ANON!, ANON!, { method: "POST", body: JSON.stringify({ type: "magiclink", token_hash: hashed }) });
    const token = (session.body as { access_token?: string }).access_token;
    if (!token) throw new Error(`test user ${label} could not sign in: HTTP ${session.status}`);
    return { id: user.id, token, createdAt: user.created_at ?? "" };
  } catch (error) {
    await admin(`/auth/v1/admin/users/${user.id}`, { method: "DELETE" });
    throw error;
  }
}

const users: TestUser[] = [];
try {
  const a = await createUser("a");
  users.push(a);
  const b = await createUser("b");
  users.push(b);
  console.log(`Created 2 test users at ${a.createdAt} and ${b.createdAt} (no ids shown).`);
  const asA = (path: string, init?: RequestInit) => call(path, ANON!, a.token, init);
  const asB = (path: string, init?: RequestInit) => call(path, ANON!, b.token, init);

  // User A: one habit, one tick, as the app writes them.
  const habitId = randomUUID();
  const today = new Date().toISOString().slice(0, 10);
  const habit = await asA("/rest/v1/protocol_steps", { method: "POST", body: JSON.stringify({ id: habitId, owner_id: a.id, position: 1, label: "Phase 8 gate check", habit_kind: "check", unit: null, daily_target: null }) });
  const tick = await asA("/rest/v1/step_checkins", { method: "POST", body: JSON.stringify({ user_id: a.id, step_id: habitId, local_date: today }) });
  check("setup: A adds a habit and ticks it", habit.status === 201 && tick.status === 201, `HTTP ${habit.status} and ${tick.status}`);
  const own = await asA("/rest/v1/step_checkins?select=user_id");
  check("setup: A reads their own tick", rows(own).length === 1, `${rows(own).length} row(s)`);

  // (b) B must see none of it.
  const all = await asB("/rest/v1/step_checkins?select=user_id");
  check("(b) B reads step_checkins with no filter", all.status === 200 && rows(all).every((r) => r.user_id === b.id) && rows(all).length === 0, `HTTP ${all.status}, ${rows(all).length} row(s), ${rows(all).filter((r) => r.user_id !== b.id).length} belonging to someone else`);
  const aimed = await asB(`/rest/v1/step_checkins?select=user_id&user_id=eq.${a.id}`);
  check("(b) B asks for A's rows by A's user id", aimed.status === 200 && rows(aimed).length === 0, `HTTP ${aimed.status}, ${rows(aimed).length} row(s)`);
  const byStep = await asB(`/rest/v1/step_checkins?select=user_id&step_id=eq.${habitId}`);
  check("(b) B asks for A's rows by A's habit id", byStep.status === 200 && rows(byStep).length === 0, `HTTP ${byStep.status}, ${rows(byStep).length} row(s)`);
  const forged = await asB("/rest/v1/step_checkins", { method: "POST", body: JSON.stringify({ user_id: a.id, step_id: habitId, local_date: today }) });
  const after = await asA("/rest/v1/step_checkins?select=user_id");
  check("(b) B cannot write a tick in A's name", forged.status >= 400 && after.status === 200 && rows(after).length === 1, `HTTP ${forged.status}; A still has ${rows(after).length} tick(s)`);

  // (c) A is a free user.
  const profile = await asA("/rest/v1/user_profiles?select=subscription_tier");
  check("(c) setup: A is on the free tier", rows(profile)[0]?.subscription_tier === "free", `tier ${String(rows(profile)[0]?.subscription_tier)}`);
  const papers = await asA("/rest/v1/papers?select=id,slug,access_tier");
  const members = rows(papers).find((p) => p.slug === MEMBERS_SLUG);
  const free = rows(papers).find((p) => p.access_tier === "free");
  check(`(c) setup: ${MEMBERS_SLUG} is listed and is members-only`, members?.access_tier === "premium", `access_tier ${String(members?.access_tier)}`);
  const gated = await asA(`/rest/v1/paper_content?select=paper_id&paper_id=eq.${String(members?.id)}`);
  check(`(c) a free user gets no paper_content row for ${MEMBERS_SLUG}`, gated.status === 200 && rows(gated).length === 0, `HTTP ${gated.status}, ${rows(gated).length} row(s)`);
  const open = await asA(`/rest/v1/paper_content?select=paper_id&paper_id=eq.${String(free?.id)}`);
  check(`(c) control: the same question for the free paper ${String(free?.slug)} returns its row`, rows(open).length === 1, `${rows(open).length} row(s)`);
  const everything = await asA("/rest/v1/paper_content?select=paper_id");
  // every() passes on an empty list, so an answer with no rows, or an error, must fail here.
  check("(c) reading all of paper_content returns free papers only", everything.status === 200 && rows(everything).length >= 1 && rows(everything).every((r) => rows(papers).find((p) => p.id === r.paper_id)?.access_tier === "free"), `HTTP ${everything.status}, ${rows(everything).length} row(s), ${rows(everything).filter((r) => rows(papers).find((p) => p.id === r.paper_id)?.access_tier !== "free").length} not free`);
} finally {
  // Always clean up. Only the ids this run created, held in memory in `users`:
  // never a lookup by email, domain or creation time.
  let left = 0;
  for (const user of users) {
    const gone = await admin(`/auth/v1/admin/users/${user.id}`, { method: "DELETE" });
    if (gone.status >= 300) left += 1;
  }
  let orphans = 0;
  for (const user of users) {
    for (const table of ["step_checkins?user_id", "protocol_steps?owner_id", "user_profiles?id"]) {
      const [name, column] = table.split("?");
      orphans += rows(await admin(`/rest/v1/${name}?select=*&${column}=eq.${user.id}`)).length;
    }
  }
  check("cleanup: both test users deleted, none of their rows left", left === 0 && orphans === 0, `${users.length - left} of ${users.length} deleted, ${orphans} row(s) left`);
}

console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
