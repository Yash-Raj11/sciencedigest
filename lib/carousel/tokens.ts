/**
 * The slide palettes and sizes. Satori has no CSS variables, so the theme tokens are copied
 * here as literal values; scripts/verify-parity.mts fails if they drift from app/globals.css. Orange means "this paper's finding" (measured), as on the site.
 */

/** Each key is the name of a token in the dark theme of app/globals.css. */
export const COLOR = {
  bg: "#0a0a0a",
  surface: "#161616",
  raised: "#212121",
  line: "#2e2e2e",
  ink: "#f5f4f0",
  muted: "#a6a39e",
  "signal-evidence-text": "#ffb38a",
  "signal-evidence-fill": "#ffb38a",
  "on-signal-evidence-fill": "#0a0a0a",
  "signal-evidence-pale": "#4a2e1d",
  "signal-evidence-soft": "#2a1a10",
} as const;

/** The same tokens from the light theme (white + orange): the light set of every deck. */
export const COLOR_LIGHT = {
  bg: "#f6f3ee",
  surface: "#ffffff",
  raised: "#faf8f4",
  line: "#e2ddd4",
  ink: "#15120f",
  muted: "#5b554e",
  "signal-evidence-text": "#ad5428",
  "signal-evidence-fill": "#ffb38a",
  "on-signal-evidence-fill": "#15120f",
  "signal-evidence-pale": "#ffdcc6",
  "signal-evidence-soft": "#fff4ec",
} as const;

export type Palette = { readonly [K in keyof typeof COLOR]: string };

/**
 * The deck's brighter orange (owner's carousel design, 2026-11-20), for the Instagram slides only.
 * Each key here reads the deck-only token named in VIVID_TOKENS (app/globals.css), not the site's.
 */
export const VIVID_TOKENS = {
  "signal-evidence-text": "deck-vivid-text",
  "signal-evidence-fill": "deck-vivid-fill",
  "on-signal-evidence-fill": "on-deck-vivid-fill",
} as const;
const VIVID_DARK = { "signal-evidence-text": "#ff7a1a", "signal-evidence-fill": "#ff7a1a", "on-signal-evidence-fill": "#0a0a0a" } as const;
const VIVID_LIGHT = { "signal-evidence-text": "#c2410c", "signal-evidence-fill": "#ea580c", "on-signal-evidence-fill": "#ffffff" } as const;

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

/** Which theme block of app/globals.css each palette comes from, and which token each key reads there. */
export const COLOR_THEME = "dark";
export const PALETTES: { look: Look; theme: "dark" | "light"; colors: Palette; names: Partial<Record<keyof Palette, string>> }[] = [
  { look: "dark", theme: "dark", colors: COLOR, names: {} },
  { look: "light", theme: "light", colors: COLOR_LIGHT, names: {} },
  { look: "dark-vivid", theme: "dark", colors: { ...COLOR, ...VIVID_DARK }, names: VIVID_TOKENS },
  { look: "light-vivid", theme: "light", colors: { ...COLOR_LIGHT, ...VIVID_LIGHT }, names: VIVID_TOKENS },
];

export const isLook = (v: unknown): v is Look => (LOOKS as readonly unknown[]).includes(v);
export const paletteOf = (look: Look): Palette => PALETTES.find((p) => p.look === look)!.colors;

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
