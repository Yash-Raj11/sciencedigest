#!/usr/bin/env bash
# Runs the pgTAP suite against a plain Postgres, for machines without Docker.
#
#   npm run db:test:local
#
# With Docker available, prefer `npm run db:test` (supabase test db), which
# runs the same files against a real local Supabase stack.
#
# Needs: psql, a Postgres 15+ you can create databases on, and the pgTAP
# extension installed on that server. Point PGADMIN_URL at it:
#
#   PGADMIN_URL=postgres://postgres@127.0.0.1:5432/postgres npm run db:test:local
#
# Each run builds two throwaway databases from scratch (shim, then every
# migration in order): one without the seed, and one WITH supabase/seed.sql
# plus supabase/tests/local/background_users.sql (other people's accounts and
# ticks), then runs every test file against both. Nothing is left behind.

set -uo pipefail

ADMIN_URL="${PGADMIN_URL:-postgres://postgres@127.0.0.1:5432/postgres}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${ADMIN_URL%/*}"
ONLY="${1:-}"
# The mutation test points this at a deliberately broken copy of the migrations.
MIGRATIONS_DIR="${MIGRATIONS_DIR:-$ROOT/supabase/migrations}"
SEED_FILE="$ROOT/supabase/seed.sql"
BACKGROUND_FILE="$ROOT/supabase/tests/local/background_users.sql"

psql_admin() { psql "$ADMIN_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }

DBS=()
cleanup() {
  local old
  for old in "${DBS[@]:-}"; do
    [ -n "$old" ] && psql_admin -c "drop database if exists $old with (force)" >/dev/null 2>&1
  done
  # The shim's roles are cluster-wide; remove them so the next run starts clean.
  psql_admin -c "drop role if exists anon; drop role if exists authenticated; drop role if exists service_role" >/dev/null 2>&1
}
trap cleanup EXIT

total_failed=0
summary=()

# run_pass <label> <seed: yes|no>
# Builds one throwaway database (shim, every migration, optionally the seed)
# and runs every test file against it.
run_pass() {
  local label="$1" seed="$2"
  local db="sciencedigest_test_$$_${label}"
  local url="$BASE/$db"

  echo
  echo "## pass: $label"
  # The shim creates cluster-wide roles, so the previous pass's database and
  # those roles must go before the next shim can run.
  cleanup
  DBS+=("$db")
  psql_admin -c "drop database if exists $db with (force)" >/dev/null 2>&1
  psql_admin -c "create database $db" || { echo "could not create test database"; exit 2; }
  psql_admin -c "alter database $db set search_path to public, extensions" || exit 2

  echo "# shim"
  psql "$url" -X -q -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/local/supabase_shim.sql" || { echo "shim failed"; exit 2; }

  for migration in "$MIGRATIONS_DIR"/*.sql; do
    echo "# migration $(basename "$migration")"
    psql "$url" -X -q -v ON_ERROR_STOP=1 -f "$migration" || { echo "migration failed: $migration"; exit 2; }
  done

  if [ "$seed" = yes ]; then
    echo "# seed $(basename "$SEED_FILE")"
    psql "$url" -X -q -v ON_ERROR_STOP=1 -f "$SEED_FILE" || { echo "seed failed: $SEED_FILE"; exit 2; }
    # Other people's accounts, ticks and habits, as on a live project. Local only:
    # this file is never in config.toml's seed paths (scripts/seed-safety.test.ts).
    echo "# background $(basename "$BACKGROUND_FILE")"
    psql "$url" -X -q -v ON_ERROR_STOP=1 -f "$BACKGROUND_FILE" || { echo "background users failed: $BACKGROUND_FILE"; exit 2; }
  fi

  local failed=0 files=0 assertions=0
  for test in "$ROOT"/supabase/tests/database/*.test.sql; do
    local name out status oks
    name="$(basename "$test")"
    if [ -n "$ONLY" ] && [[ "$name" != *"$ONLY"* ]]; then continue; fi
    files=$((files + 1))
    echo
    echo "# $name"
    out="$(psql "$url" -X -q -A -t -v ON_ERROR_STOP=1 -f "$test" 2>&1)"
    status=$?
    echo "$out"
    oks=$(printf '%s\n' "$out" | grep -c '^ok ')
    assertions=$((assertions + oks))
    if [ $status -ne 0 ] \
      || printf '%s\n' "$out" | grep -q '^not ok' \
      || printf '%s\n' "$out" | grep -q '^# Looks like' \
      || ! printf '%s\n' "$out" | grep -q '^1\.\.[0-9]'; then
      failed=$((failed + 1))
      echo "# FAILED: $name ($label)"
    fi
  done

  summary+=("$label: $files files, $assertions assertions, $failed failed")
  total_failed=$((total_failed + failed))
}

cleanup
# Unseeded: only the tests' own fixtures exist.
run_pass unseeded no
# Seeded: the real starter papers and two background users sit beside the
# fixtures, as on a hosted project. A test that assumes an empty table fails here.
run_pass seeded yes

echo
for line in "${summary[@]}"; do echo "# $line"; done
if [ $total_failed -eq 0 ]; then
  echo "# Result: PASS (both passes)"
  exit 0
fi
echo "# Result: FAIL ($total_failed test files failed across both passes)"
exit 1
