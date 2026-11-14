/**
 * The real context studies and fact library (content/context/, content/library.json), for tests
 * that lint a real read: caffeine's simulator draws on the half-life study, so a test that lints
 * caffeine's editorial needs the study and the library, exactly as the build loads them.
 */

import { fileURLToPath } from "node:url";
import { loadContext } from "../../../scripts/context-load";

const ROOT = fileURLToPath(new URL("../../../content/", import.meta.url));
const loaded = loadContext(`${ROOT}context`, `${ROOT}concepts`);
if (loaded.libraryErrors.length > 0) throw new Error(loaded.libraryErrors.join("\n"));

export const REAL_STUDIES = loaded.context.studies;
export const REAL_LIBRARY = loaded.context.library ?? [];
export const HALF_LIFE_STUDY = "caffeine-saliva-half-life";
