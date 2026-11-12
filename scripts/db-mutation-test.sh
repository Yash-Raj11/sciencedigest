#!/usr/bin/env bash
# Proves the database tests FIRE when a rule is broken.
#
#   npm run db:mutation
#
# A test suite that passes tells you little unless you have seen it fail. Each
# case below copies the migrations, breaks exactly one rule with a one-line
# edit, and re-runs the suite. The run must fail, and the named test must be
# among the failures. If a mutation "survives" (the suite still passes), that
# rule is not actually being tested.
#
# Needs the same PGADMIN_URL as db:test:local.

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
CORE="20261112000100_core.sql"
SCORING="20261112000200_scoring.sql"
PREMIUM="20261112000300_premium.sql"

survived=0
killed=0

# mutate <label> <file> <python regex> <replacement> <text that must appear in a failing test line>
mutate() {
  local label="$1" file="$2" pattern="$3" replacement="$4" expect="$5"
  rm -rf "$WORK/m" && mkdir -p "$WORK/m" && cp "$ROOT"/supabase/migrations/*.sql "$WORK/m/"
  if ! python3 - "$WORK/m/$file" "$pattern" "$replacement" <<'PY'
import re, sys
path, pattern, replacement = sys.argv[1:4]
source = open(path).read()
mutated, count = re.subn(pattern, replacement, source, count=1, flags=re.S)
if count != 1:
    sys.exit(f"mutation pattern did not match: {pattern}")
open(path, "w").write(mutated)
PY
  then
    echo "ERROR    $label (the mutation could not be applied; fix this script)"
    survived=$((survived + 1))
    return
  fi

  local out
  out="$(MIGRATIONS_DIR="$WORK/m" bash "$ROOT/scripts/db-test-local.sh" 2>&1)"
  if printf '%s\n' "$out" | grep -q '^# Result: PASS'; then
    echo "SURVIVED $label  <-- no test noticed this"
    survived=$((survived + 1))
  elif printf '%s\n' "$out" | grep -E '^not ok|^# FAILED|migration failed|ERROR' | grep -qF "$expect"; then
    echo "killed   $label"
    printf '%s\n' "$out" | grep -E '^not ok' | head -3 | sed 's/^/           /'
    killed=$((killed + 1))
  else
    echo "killed?  $label (suite failed, but not on the expected test: \"$expect\")"
    printf '%s\n' "$out" | grep -E '^not ok|^# FAILED|ERROR' | head -4 | sed 's/^/           /'
    survived=$((survived + 1))
  fi
}

mutate "premium papers hidden from the public list" "$CORE" \
  'using \(published_at is not null\);' \
  "using (published_at is not null and access_tier = 'free');" \
  '1. anon sees all rows in papers'

mutate "paper_content readable by everyone" "$CORE" \
  "and \(p\.access_tier = 'free' or \(select private\.is_premium\(\)\)\)\n    \)\n  \);\n\ncreate policy \"steps" \
  "and true\n    )\n  );\n\ncreate policy \"steps" \
  '2. anon sees paper_content only for free papers'

mutate "is_premium() always false" "$CORE" \
  "and subscription_tier = 'premium'\n  \)" \
  "and subscription_tier = 'premium' and false\n  )" \
  '4. a premium user sees all paper_content'

mutate "blanket privileges left in place (no revoke)" "$CORE" \
  'revoke all on all tables in schema public from anon, authenticated;' \
  '-- (revoke removed)' \
  '5. a user cannot UPDATE their own subscription_tier'

mutate "any signed-in user can read every tick" "$CORE" \
  'create policy "checkins: read own" on public\.step_checkins\n  for select to authenticated\n  using \(user_id = \(select auth\.uid\(\)\)\);' \
  'create policy "checkins: read own" on public.step_checkins\n  for select to authenticated\n  using (true);' \
  "6. a user cannot read another user's step_checkins"

mutate "derived steps can be ticked" "$CORE" \
  "if step\.kind <> 'action' then" \
  "if false then" \
  '7. inserting a checkin for a condition step'

mutate "ticks no longer move the dormancy clock" "$CORE" \
  'set last_active_on = greatest\(e\.last_active_on, new\.local_date\)' \
  'set last_active_on = e.last_active_on' \
  '8b. ...and updates last_active_on'

mutate "ungraded steps carry weight" "$CORE" \
  'else 0\.0\n  end::numeric' \
  'else 0.1\n  end::numeric' \
  "9. evidence_weight('none') returns 0.0"

mutate "a grade no longer needs a source estimate" "$CORE" \
  "constraint steps_grade_needs_source check \(source_estimate is not null or evidence_grade = 'none'\)," \
  "" \
  "10. a step with null source_estimate and grade 'high'"

mutate "an everyday habit may carry an evidence grade" "$CORE" \
  "and evidence_grade = 'none'\n      and source_estimate is null" \
  "and true\n      and true" \
  'not even the database owner can give a habit an evidence grade'

mutate "ticks accepted without equipping the protocol" "$CORE" \
  "raise exception 'protocol for step % is not equipped'" \
  "raise notice 'protocol for step % is not equipped'" \
  'a step cannot be ticked before its protocol is equipped'

mutate "dormancy window widened from 7 to 8 days (SQL only)" "$SCORING" \
  '\(p_date - e\.last_active_on\) > 7 as dormant' \
  '(p_date - e.last_active_on) > 8 as dormant' \
  'matches lib/score.ts'

mutate "rounding changed from half-up to floor (SQL only)" "$SCORING" \
  '\(\(200 \* coalesce\(numerator, 0\) \+ denominator\) / \(2 \* denominator\)\)::integer' \
  '((100 * coalesce(numerator, 0)) / denominator)::integer' \
  'matches lib/score.ts'

mutate "regimen analysis handed to free users" "$PREMIUM" \
  "if uid is null or not private\.has_feature\('regimen_analysis'\) then" \
  "if uid is null then" \
  'a free user gets a locked response'

echo
echo "# Mutations killed: $killed, survived: $survived"
[ "$survived" -eq 0 ]
