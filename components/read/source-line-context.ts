"use client";

/**
 * The read's source line (who · design · how many or how long), for every passage on the page.
 * Its own module so a figure can read it without importing the read's parts (no cycle through
 * the figure registry).
 */

import { createContext, useContext } from "react";

export const SourceLineContext = createContext<string | undefined>(undefined);

export const useSourceLine = () => useContext(SourceLineContext);
