import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** The props of a figure that say where and how big, never how much. */
const FIGURE_GEOMETRY = "/^(x|y|x1|y1|x2|y2|cx|cy|r|rx|ry|dx|dy|width|height|d|viewBox|points|transform|strokeWidth|strokeDasharray|fontSize|opacity|size|gap|min|max|nodeHeight|rowHeight|labelWidth|className)$/";

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
    // Figures and their shared primitives are held to the same rule.
    files: ["components/papers/**/*.{ts,tsx}", "components/figures/**/*.{ts,tsx}"],
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

  /*
   * THE FIGURE GUARD.
   *
   * A file under components/papers/<slug>/figures/ arranges shapes. It may say
   * where things go (x, y, width, r ... the props named below) and nothing
   * else in numbers: any number a reader sees must arrive through `params`,
   * where the content build has tied it to a gated fact (lib/pipeline/lint.ts).
   * So: no numeric literal outside a geometry prop, and no digit typed into
   * the text of a figure. Sums and formatting live in components/figures/.
   * Tested by scripts/figure-guard.test.ts.
   */
  {
    files: ["components/papers/**/figures/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error",
        {
          selector: `Literal[raw=/^[0-9.]/]:not(JSXAttribute[name.name=${FIGURE_GEOMETRY}] Literal)`,
          message: "A figure holds no number of its own outside a geometry prop (x, y, width, r, d ...). A number the reader sees comes from params, bound to a gated fact.",
        },
        {
          selector: "JSXText[value=/[0-9]/]",
          message: "No digits typed into a figure's text. A number the reader sees comes from params, bound to a gated fact.",
        },
        {
          selector: `Literal[raw=/^["'].*[0-9]/]:not(JSXAttribute[name.name=${FIGURE_GEOMETRY}] Literal)`,
          message: "No digits in a figure's own strings. A number the reader sees comes from params, bound to a gated fact.",
        },
        {
          selector: `TemplateElement[value.raw=/[0-9]/]:not(JSXAttribute[name.name=${FIGURE_GEOMETRY}] TemplateElement)`,
          message: "No digits in a figure's own strings. A number the reader sees comes from params, bound to a gated fact.",
        },
      ],
    },
  },

  // Tests build deliberately malformed input, which needs `any`.
  {
    files: ["**/*.test.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },

  globalIgnores([
    ".claude/**", // skills and their scripts (third-party; not part of the app)
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
