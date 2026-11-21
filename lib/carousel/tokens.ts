/**
 * The slide looks, sizes and type. Browser-safe (the queue imports it): no colour values here.
 * Satori has no CSS variables, so palettes.ts reads each colour from app/globals.css at render
 * time (node only). Orange means "this paper's finding" (measured), as on the site.
 */

/** The colour tokens a slide reads, by their name in app/globals.css. Their values live in
 *  palettes.ts, read from app/globals.css itself (node only). */
export const COLOR_KEYS = [
  "bg", "surface", "raised", "line", "ink", "muted",
  "signal-evidence-text", "signal-evidence-fill", "on-signal-evidence-fill", "signal-evidence-pale", "signal-evidence-soft",
] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];
export type Palette = { readonly [K in ColorKey]: string };

/**
 * The deck's brighter orange (owner's carousel design, 2026-11-20), for the Instagram slides only.
 * Each key here reads the deck-only token named in VIVID_TOKENS (app/globals.css), not the site's.
 */
export const VIVID_TOKENS = {
  "signal-evidence-text": "deck-vivid-text",
  "signal-evidence-fill": "deck-vivid-fill",
  "on-signal-evidence-fill": "on-deck-vivid-fill",
} as const;

/**
 * Every deck is drawn whole in each look: on black or on white, in the site's orange or the
 * deck's brighter one. The owner picks which set to post in /admin/queue.
 */
export const LOOKS = ["dark", "light", "dark-vivid", "light-vivid"] as const;
export type Look = (typeof LOOKS)[number];
export const LOOK_NAME: Record<Look, string> = {
  dark: "Black, site orange",
  light: "White, site orange",
  "dark-vivid": "Black, bright orange",
  "light-vivid": "White, bright orange",
};

export const isLook = (v: unknown): v is Look => (LOOKS as readonly unknown[]).includes(v);

/** Instagram portrait, 4:5. */
export const SLIDE = { width: 1080, height: 1350, padX: 80, padY: 72 } as const;

/** The art's drawing box (viewBox units). Art components draw inside it and nowhere else. */
export const ART = { width: 904, height: 620 } as const;

export const TYPE = {
  brand: 26,
  tag: 28,
  small: 26,
  chip: 26,
  headingHook: 108,
  heading: 84,
  headingSmall: 72,
  body: 42,
  label: 40,
  row: 38,
  rowTitle: 40,
  receipt: 34,
  pictureLabel: 32,
  rangeValue: 72,
  rangeEnd: 30,
  rangePoint: 50,
  value: 240,
  valuePair: 120,
  unit: 48,
  unitPair: 40,
  cta: 32,
} as const;

/** The headings' weight and tracking: heavy and tight, as in the owner's carousel design (2026-11-20). */
export const HEADING = { weight: 800, tracking: -0.02 } as const;

export const SANS = "Archivo";
export const SERIF = "Newsreader";

/** Dashed = the authors' explanation (proposed), as on the site's figures. */
export const DASH = "22 16";
/** Round-capped dashes this short draw as dots: the sketch line (CLAUDE.md, sketch rule). */
export const DOTS = "1 18";
/** The line width of the art's main strokes, and of its scenery. */
export const STROKE = { main: 14, thin: 8 } as const;
