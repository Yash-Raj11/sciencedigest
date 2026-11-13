/**
 * TEMPORARY. Delete this file in step 2E of docs/MASTER-PROMPT.md.
 *
 * Since step 2A every read must be written in three layers (H10). The three
 * starter papers were written before that rule, in the old flat shape, and are
 * rewritten in step 2E. Until then this list is the only thing that lets an
 * old-shape read into the app: content-build and the paper command pass
 * `allowLegacyShape` for these slugs and for nothing else.
 *
 * scripts/legacy-shape.test.ts fails if a slug here is no longer in the old
 * shape, and fails if this list is not empty once 2E is ticked in
 * docs/PROGRESS.md. Never add a slug.
 */
export const LEGACY_SHAPE_ALLOWLIST: readonly string[] = [
  "daytime-caffeine-sleep",
  "hiit-body-composition",
  "steps-days-per-week",
];
