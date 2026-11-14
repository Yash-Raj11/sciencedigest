/**
 * Prints the contrast table for the theme in app/globals.css (owner, 2026-11-14):
 * every text token on the page and on a card, both modes. The same sums are a test
 * (scripts/visual-system.test.ts).
 *
 *   npx tsx scripts/contrast-table.mts > docs/evidence/readability/contrast.md
 */

import { readFileSync } from "node:fs";
import { contrastTable, formatContrastTable } from "../lib/contrast";

console.log(`# Contrast, WCAG 2 (generated from app/globals.css)\n\n${formatContrastTable(contrastTable(readFileSync("app/globals.css", "utf8")))}`);
