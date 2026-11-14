#!/usr/bin/env bash
# Serves the browser-test build (.next-browser, fake Supabase) on 127.0.0.1:3212 for screenshots.
# Build it first with `npx playwright test` or the same env and `next build`. Local only.
set -euo pipefail
lsof -ti tcp:3212 | xargs kill 2>/dev/null || true
sleep 1
NEXT_DIST_DIR=.next-browser NEXT_PUBLIC_SUPABASE_URL=https://sd-browser-test.invalid \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=browser-test-key NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA \
  nohup node_modules/.bin/next start -p 3212 -H 127.0.0.1 > "${TMPDIR:-/tmp}/sd-serve-local.log" 2>&1 &
for _ in $(seq 1 20); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3212/)" = 200 ]; then echo "serving http://127.0.0.1:3212"; exit 0; fi
  sleep 1
done
echo "the server did not start; see ${TMPDIR:-/tmp}/sd-serve-local.log" >&2; exit 1
