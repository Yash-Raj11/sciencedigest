import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  /*
   * THE WIDGET GUARD.
   *
   * A file under components/papers/<slug>/ decides how one paper's simulator
   * and protocol LOOK. It may not talk to the database, reach into the store,
   * or work out a score or a percentage of its own: all of that comes from
   * useProtocol() and the shared primitives. Two hundred papers each doing
   * their own saving and their own sums is two hundred slightly different bugs.
   */
  {
    files: ["components/papers/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@supabase/*"], message: "Per-paper components never talk to the database. Use useProtocol()." },
          { group: ["@/lib/supabase", "@/lib/supabase/*"], message: "Per-paper components never talk to the database. Use useProtocol()." },
          { group: ["@/lib/store", "@/lib/store/*"], message: "Per-paper components never touch the store. Use useProtocol()." },
          { group: ["@/lib/score", "@/lib/progress"], message: "Per-paper components never compute scores or progress. Read them from useProtocol()." },
        ],
        paths: [
          { name: "@/lib/evidence", importNames: ["pct", "WEIGHT_TENTHS"], message: "Per-paper components never compute a percentage. Read `progress.pct` from useProtocol()." },
        ],
      }],
    },
  },

  // Tests build deliberately malformed input, which needs `any`.
  {
    files: ["**/*.test.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },

  globalIgnores([
    ".next/**",
    ".next-browser/**", // the browser test's own build (playwright.config.ts)
    ".next-browser-dev/**", // the dev server of tests/browser/paper-routes-dev.spec.ts
    "test-results/**",
    "playwright-report/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Written by `npm run content:build`; never edited by hand.
    "lib/content/generated.ts",
  ]),
]);

export default eslintConfig;
