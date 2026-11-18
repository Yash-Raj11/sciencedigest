---
name: unslop-ui
description: Design, typography, motion and UX rules for the Science Digest app. Use whenever building or changing any UI, page, card, feed, or interactive habit/protocol widget.
---

# Science Digest — UI rules (unslop)

One file holds every UI rule. Each rule says what it means **for this app**, especially the
habit widget, which is the core product. Run the Section 7 checklist before calling UI work done.

---

## 0. Where this file gives way to `CLAUDE.md`

`CLAUDE.md` and the code that enforces it win over anything below. Where the two touch:

| Here | Resolved as |
|---|---|
| Section 6 starter tokens (green accent) | **Not used.** The tokens in `app/globals.css` are the design system: dark, light and bedtime themes, pastel orange as the one accent (`--signal-evidence-*`). Never add a second accent or a hue-named token. |
| "% of protocol completed" ring | The ring shows a number the app already has: **evidence-weighted adherence** or **plain consistency** (boxes ticked today), computed in `lib/score.ts`. No new percentage, XP or points (rule 3). A per-paper component never computes it (widget guard). |
| Specific headlines | The headline stays **one yes/no question with the plain finding beneath it** (`lib/pipeline/editorial.ts`). Make the finding beneath it specific. No causal verb without a randomized design, no hype words (`lint.ts`). |
| Motion on figures | Figures hold **no timer and no animation** (figure guard). Motion rules apply to controls and the check-off moment only. |
| Squash, overshoot, count-up | Allowed **only** on the check-off / protocol-complete moment. Every other control keeps the quiet transition in `globals.css`: 120–180 ms, `--ease-out`, transform and opacity, no bounce. |
| Confetti / celebration | Never copy that implies a health outcome ("your sleep improved"). A tick records an action (rule 4). |
| `useOptimistic` + Supabase sync | The device store (`lib/store/reduce.ts`, `lib/store/sync.ts`) is already local-first; check-offs apply to it at once and sync behind. Use `useOptimistic` only where a server round trip is in the path. Load `db-change` before touching sync. |
| "Paid" badge, paywall sheet | Premium is decided on the server (rule 7). The sheet overlays the paper; members' content is never shipped and hidden with an `if`. |
| Curly quotes in seed data | `supabase/seed.sql` and `content/generated/*` are generated: fix quotes in `content/papers/<slug>/` and run `npm run content:build`. |
| Lucide icons | **Not used (owner, 2026-11-18).** The app keeps its hand-drawn inline SVG icons (tab bar, tick boxes) and text arrows. A new icon matches them: 24-unit viewBox, `stroke="currentColor"`, round caps and joins, `aria-hidden` beside a text label, stroke width matched to the text weight. No icon library without asking. |

---

## 1. Visual design

| Rule | What it means here |
|---|---|
| **Delete filler badges** | No "NEW", "🔥 Trending" or "AI-powered" chips. Show a badge only when it carries information, like `Paid` on niche papers. |
| **Drop redundant labels** | A progress ring showing `67%` needs no "Progress:" label next to it. |
| **Don't capitalise random words** | Sentence case everywhere: "Morning light protocol", not "Morning Light Protocol". |
| **Mono only where needed** | Monospace only for numbers that tick (timers, `3/5`, DOIs). Body and headings stay in the app's fonts. |
| **Use a design system** | Every colour, radius and spacing value comes from the tokens in `app/globals.css`. No one-off hex values in components. |
| **Show the actual product** | The landing page shows a real paper card and a real widget, not stock science photos. |
| **Enlarge the main feature** | The widget and its progress ring are the biggest thing on the reading screen, bigger than the summary text. |
| **Group with spacing** | Separate sections with whitespace (`gap-6`/`gap-10`), not borders and boxes everywhere. |
| **Make findings specific** | The line under the headline question says the plain finding with its number, not a topic ("The Science of Sleep"). See Section 0. |
| **Emphasise the CTA** | One filled accent button per screen ("Start protocol"). Everything else is ghost or text style. |
| **One accent colour** | A single accent hue, used only for progress, the CTA and completed states. |
| **Keep icons consistent** | One family at one stroke width. **No emoji icons inside red circles**: the widget must never look like a generic habit grid. |
| **Nested radii** | inner radius = outer radius − padding. A card at `24px` with `8px` padding holds an item at `16px`. |
| **Alpha borders** | `rgb(0 0 0 / 0.12)` in light mode and `rgb(255 255 255 / 0.10)` in dark, so borders blend into any surface. Define them as tokens. |
| **OKLCH palettes** | Build new palette steps in OKLCH so equal lightness looks equal (Tailwind v4 already uses OKLCH). |
| **Gradients `in oklch`** | `linear-gradient(90deg in oklch, …)`, so the middle doesn't turn grey. Use this for the progress-ring sweep. |
| **Icon stroke = text weight** | Body text at 400 gets `strokeWidth={1.75}`. Labels at 600 get `strokeWidth={2.25}`. |
| **Carousel edge fade** | `mask-image: linear-gradient(90deg, transparent, black 15% 85%, transparent)` on the related-papers row. |
| **Icon swaps blur out** | Circle → check: the outgoing icon fades with `filter: blur(4px)`. |
| **Dark mode depth** | Raise surfaces by making them lighter (`--surface`, `--raised`), not with shadows. |
| **`100dvh`** | Use it for full-height sections. Never `100vh`, which breaks under Safari's toolbar. |
| **Product shots** | Images on a white background get `mix-blend-mode: multiply`. |

---

## 2. Typography

| Rule | Implementation |
|---|---|
| Tabs don't shift when bolded | `.tab{display:inline-grid}` `.tab>*,.tab::after{grid-area:1/1}` `.tab::after{content:attr(data-text);font-weight:700;visibility:hidden}` |
| Labels and buttons truly centred | `text-box-trim: trim-both; text-box-edge: cap alphabetic;` (progressive: Chrome and Safari; Firefox falls back harmlessly) |
| Link underlines clear g and y | `text-underline-offset: 0.2em` |
| Superscripts don't push lines apart | `sup{line-height:0;position:relative;vertical-align:baseline;top:-0.5em}`. Needed for citation markers¹ in summaries |
| Fluid headlines | `font-size: clamp(2rem, 1rem + 5vw, 4rem)` |
| Acronyms | `font-variant-caps: all-small-caps` for RCT, BMI, HRV |
| Curly quotes only | “ ” ’ in all copy. Lint for straight `"` and `'` inside JSX text |
| File names truncate in the middle | `.name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}` `.ext{flex-shrink:0}` (for PDF attachments) |
| Narrow columns | `hyphens:auto` plus `<html lang="en">` |
| Card titles max 2 lines | `line-clamp-2` |

---

## 3. Motion

Keep motion purposeful. The **check-off moment** is where it pays off most. Figures never animate.

| Principle | Where it applies |
|---|---|
| **Snappy timing** | UI animations under **300ms**. Progress-ring fill 250ms. Ordinary controls use the `--motion-*` tokens. |
| **Slow in / slow out** | Never `linear`. Enter with `--ease-out`; exit with `cubic-bezier(0.4, 0, 1, 1)`. |
| **Squash & stretch** | The check circle scales `1 → 0.9 → 1.08 → 1` on tap. |
| **Anticipation** | A 60ms press-down (`scale .96`) on `:active` before the check lands. |
| **Follow-through** | The ring overshoots ~2% at 100%, then settles. |
| **Secondary action** | When the protocol reaches 100%, the number counts up. Small confetti at most, no full-screen takeover. |
| **Exaggerated feedback** | Completing the *whole* protocol gets the one big moment. Single steps stay subtle. |
| **Staging** | Animate one thing at a time: the step checks, *then* the ring fills. |
| **Pose to pose** | Keyframes and CSS transitions. No JS-driven frame loops. |
| **Arcs** | Anything that travels (a card flying to "Saved") moves on a curve. |
| **Solid drawing** | Give the progress ring a subtle inner track, so it reads as having depth. |
| **Frequency of use** | Daily repeat check-ins animate *less* than first-time completions. Tab switches don't animate. |
| **Reduced motion** | Wrap everything in `@media (prefers-reduced-motion: no-preference)`. |

---

## 4. UX laws

- **Fitts's law.** Habit check targets are at least 44×44px. The hit area can extend past the visible circle using a pseudo-element.
- **Hick's law.** Each protocol has 3–5 steps, never 12.
- **Miller's law.** Chunk summaries into at most ~5 key facts. "7±2" is the popular figure, but later work (Cowan, 2001) puts working memory nearer **4 chunks**. Design for 4.
- **Doherty threshold.** Respond within 400ms. Check-offs apply locally first.
- **Postel's law.** Accept messy input ("10 min", "10m", "ten minutes" in custom timers) and display it cleanly.
- **Jakob's law.** Bottom tab bar, swipe-to-dismiss sheets, pull-to-refresh.

---

## 5. App behaviour

| # | Rule | Implementation in our stack |
|---|---|---|
| 6 | X closes, ← goes back | X in modals and the paywall sheet. ← on the paper reader. Never swap them. |
| 7 | Never a blank screen | A `loading.tsx` skeleton for each App Router segment: paper card skeleton, widget skeleton. |
| 8 | Keep scroll position | The feed saves `scrollY` to `sessionStorage` keyed by route (try/catch) and restores it on mount. |
| 9 | Tap the active tab to scroll up | Bottom nav: `if (pathname === href) window.scrollTo({top:0, behavior:'smooth'})`. |
| 10 | Load the next one early | No infinite scroll: the feed is a finite daily stack. Prefetch the *next paper* (`router.prefetch`) when the current one is 70% read. |
| 11 | Instant check-offs and saves | Apply locally first, sync in the background, roll back with a toast on error (see Section 0). |
| 12 | Autosave drafts | Widget progress and notes persist on every change (try/catch), then reconcile on reconnect. The device stores ids and dates only (rule 5). |
| 13 | Ask for permissions in context | Ask for notifications only when the user taps "Remind me tomorrow" on a protocol. Never on first launch. |
| 14 | Bottom sheets | Quick actions (save, share, report an error in a paper) open a sheet. Swipe down dismisses it. |
| 15 | Deep links | Notifications and shared links open `/p/[slug]#widget`, never the home screen. Paid content opens the paywall sheet *over* that paper. |

---

## 6. Tokens

Use the tokens already in `app/globals.css`; do not paste a starter palette over them. Missing
pieces go **into** that file as meaning-named tokens, for example:

```css
:root {
  --radius-card: 24px;
  --radius-item: 16px;            /* card radius minus 8px padding */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --hairline: rgb(0 0 0 / 0.12);  /* light; dark and bedtime: rgb(255 255 255 / 0.10) */
}

@layer base {
  a { text-underline-offset: 0.2em; }
  sup { line-height: 0; position: relative; vertical-align: baseline; top: -0.5em; }
  abbr { font-variant-caps: all-small-caps; }
  :where(button, .label) { text-box-trim: trim-both; text-box-edge: cap alphabetic; }
}

@layer components {
  .tab { display: inline-grid; }
  .tab > *, .tab::after { grid-area: 1 / 1; }
  .tab::after { content: attr(data-text); font-weight: 700; visibility: hidden; }
  .fade-edges { mask-image: linear-gradient(90deg, transparent, black 15% 85%, transparent); }
  .progress-ring {
    background: conic-gradient(in oklch,
      var(--signal-evidence-fill) calc(var(--p) * 1%),
      var(--signal-evidence-soft) 0);
  }
}
```

---

## 7. Pre-ship checklist (run before saying "done")

- [ ] No emoji used as icons. One icon family, stroke width matched to the adjacent text weight
- [ ] Exactly one filled CTA per screen. The accent appears only on progress, CTA and completed states
- [ ] Widget ring shows adherence or consistency from `lib/score.ts` and updates on every interaction; no new number
- [ ] Check-offs apply instantly and roll back on error
- [ ] Every route segment has a `loading.tsx` skeleton
- [ ] No `100vh`, no `linear` easing, no animation over 300ms (the 100% celebration may run to 600ms); no animation in a figure
- [ ] `prefers-reduced-motion` respected
- [ ] No straight quotes in user-facing copy: `grep -rnE "[>][^<]*['\"][^<]*[<]" app/ components/`
- [ ] The line under each headline question states a specific finding, not a topic
- [ ] Hit targets ≥ 44px. Protocols have 3–5 steps
- [ ] Deep link `/p/[slug]#widget` opens the right paper, and the paywall sheet overlays it
- [ ] `npm run lint && npm run typecheck && npm test && npm run build` pass
