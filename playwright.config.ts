import { defineConfig, devices } from "@playwright/test";

// `npm run test:browser`: tests that need a real browser (tests/browser/).
// The app is built and served in production mode into its own folder
// (.next-browser, so it never touches .next/ or a running `next dev`), with a
// FAKE Supabase address, so nothing here can reach the real project, and with
// a Turnstile site key so the CAPTCHA path is live. Values set here win over
// .env.local.
const PORT = 3211;
const DIST = ".next-browser";

export default defineConfig({
  testDir: "tests/browser",
  timeout: 60000,
  fullyParallel: false,
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${PORT}`, ...devices["Pixel 7"] },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: `node_modules/.bin/next build && node_modules/.bin/next start -p ${PORT} -H 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 180000,
    env: {
      NEXT_DIST_DIR: DIST,
      NEXT_PUBLIC_SUPABASE_URL: "https://sd-browser-test.invalid",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "browser-test-key",
      // Cloudflare's documented test key; the script is blocked in the test anyway.
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
    },
  },
});
