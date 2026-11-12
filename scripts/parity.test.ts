import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { PARITY_PATH, buildParitySql } from "./gen-parity.mts";

it("the committed SQL parity test matches what lib/score.ts produces today", () => {
  // If this fails you changed the scoring rule. Run `npm run parity:gen`, then
  // `npm run db:test`: the SQL mirror must be changed to agree before it passes.
  expect(readFileSync(PARITY_PATH, "utf8")).toBe(buildParitySql());
});
