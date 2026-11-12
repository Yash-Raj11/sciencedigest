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
# Each run builds a throwaway database from scratch: shim, then every
# migration in order, then every test file. Nothing is left behind.

set -uo pipefail

ADMIN_URL="${PGADMIN_URL:-postgres://postgres@127.0.0.1:5432/postgres}"
DB="sciencedigest_test_$$"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${ADMIN_URL%/*}"
TEST_URL="$BASE/$DB"
ONLY="${1:-}"
# The mutation test points this at a deliberately broken copy of the migrations.
MIGRATIONS_DIR="${MIGRATIONS_DIR:-$ROOT/supabase/migrations}"

psql_admin() { psql "$ADMIN_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }
psql_test() { psql "$TEST_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }

cleanup() {
  psql_admin -c "drop database if exists $DB with (force)" >/dev/null 2>&1
  # The shim's roles are cluster-wide; remove them so the next run starts clean.
  psql_admin -c "drop role if exists anon; drop role if exists authenticated; drop role if exists service_role" >/dev/null 2>&1
}
trap cleanup EXIT

cleanup
psql_admin -c "create database $DB" || { echo "could not create test database"; exit 2; }
psql_admin -c "alter database $DB set search_path to public, extensions" || exit 2

echo "# shim"
psql_test -f "$ROOT/supabase/tests/local/supabase_shim.sql" || { echo "shim failed"; exit 2; }

for migration in "$MIGRATIONS_DIR"/*.sql; do
  echo "# migration $(basename "$migration")"
  psql_test -f "$migration" || { echo "migration failed: $migration"; exit 2; }
done

failed=0
files=0
assertions=0

for test in "$ROOT"/supabase/tests/database/*.test.sql; do
  name="$(basename "$test")"
  if [ -n "$ONLY" ] && [[ "$name" != *"$ONLY"* ]]; then continue; fi
  files=$((files + 1))
  echo
  echo "# $name"
  out="$(psql "$TEST_URL" -X -q -A -t -v ON_ERROR_STOP=1 -f "$test" 2>&1)"
  status=$?
  echo "$out"
  oks=$(printf '%s\n' "$out" | grep -c '^ok ')
  assertions=$((assertions + oks))
  if [ $status -ne 0 ] \
    || printf '%s\n' "$out" | grep -q '^not ok' \
    || printf '%s\n' "$out" | grep -q '^# Looks like' \
    || ! printf '%s\n' "$out" | grep -q '^1\.\.[0-9]'; then
    failed=$((failed + 1))
    echo "# FAILED: $name"
  fi
done

echo
if [ $failed -eq 0 ]; then
  echo "# Result: PASS ($files files, $assertions assertions)"
  exit 0
fi
echo "# Result: FAIL ($failed of $files files failed)"
exit 1
