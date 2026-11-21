---
name: carousel-design
description: Load before designing or changing how an Instagram deck looks (lib/carousel/**, the carousel art kit, slide layout, deck looks), or before drafting a new deck's slides. Holds the design technique behind the owner's carousel design (Claude Design, 2026-11-20), adapted to this project's rules, and the export → sheet → parity loop.
---

# Carousel design

How the owner's carousel design was made, written down so every deck gets the same care. Wording
rules (H1–H12, the deck's word limits, what each slide kind says) live in `science-content`; this
skill is about how a deck **looks** and how to work on it. Where anything here touches `CLAUDE.md`,
`CLAUDE.md` wins (see "Where the design gives way", below).

## 1. Start from context, never a blank slide

A good deck is rooted in what already exists: the read, its figures, the gated facts, the site's
tokens and fonts. Before drawing, read the paper's editorial (`content/papers/<slug>/editorial.json`),
look at the read's own figures, and note which numbers have intervals. A slide invented from scratch
looks generic; a slide built from the paper's own picture looks like this paper.

## 2. Settle the direction before building the deck

When the look or the opening is still open, do not build one deck and polish it. Show **2–4
genuinely different options**, each along an axis you can name ("number first" against "plateau
first" against "threshold first"), side by side. The owner's design did this with three alternate
hooks. Rules:

- Different means a different idea, not five shades of one. Low fidelity is enough to choose.
- The case for each option, and its main trade-off, goes in your reply, never on the slide.
  Argue for every option, not only your favourite.
- Option names stay fixed across turns ("Hook C: the plateau" stays Hook C).
- Once the owner chooses, the decision stays made. Do not reopen it unasked.
- With nobody to ask, choose one direction, name it in a line, and build it.

**Every deck carries its options (owner, 2026-11-20).** `carousel.altHooks` in editorial.json holds 1 to 3
alternate opening slides, each `{ "name": "The plateau", "kind": "hook", ... }`. Each is linted exactly
like the hook, exported to `<slug>/<look>/hooks/01-hook-<letter>.png`, shown side by side in
`openings-<look>.png` by `npm run carousel:sheet`, and offered in `/admin/queue`, where the owner's
choice (A is the deck's own hook) is saved in the approval record. An alternate opens from another
angle (the headline number, the shape of the result, a question the paper answers), never a rewording.

## 3. A small system, committed to

- **Type:** Archivo 800 headlines with tight tracking (`HEADING` in `lib/carousel/tokens.ts`), Newsreader
  400 for the supporting line, Archivo for labels. No third face.
- **Colour:** one ground, ink, muted, and one accent: orange, meaning *this paper's finding*.
  Every value is a token (`app/globals.css`, copied in `tokens.ts` and held there by parity).
  The bright orange is a deck-only token, never the site's.
- **Looks:** every deck is drawn whole in each look (`LOOKS`): black or white, site orange or bright.
  Never mix black and white slides inside one look.
- Hierarchy comes from **scale and weight**, not boxes: hairline rules, no cards, no left-border
  accents, no gradients, no emoji, generous empty space. Lay out with flex and gap.

## 4. One slide, one job: the anatomy

Top to bottom, on every slide:

1. Brand and the position dots (no "1 / 8" counter: chrome holds no digits).
2. A kicker in orange ("What they found"), or on the hook a chip: design · who · how long.
3. **The headline**: one claim, three lines at most, big. If it needs four, cut words.
4. One supporting line in the serif, muted.
5. **One drawing that carries the point** (or none). It is the paper's own picture: ranges on a
   shared scale, the plateau on the paper's axis, verdict rows, the day. It sits on the slide,
   not in a card.
6. The footer: the short cite; "Swipe" on the hook; the source block on the last slide.

Text is sized for a phone held at arm's length: nothing under 26 px on a 1080 px slide.

## 5. The copy is the product

- Specific to this paper, from its gated facts. No filler, no "data slop": a number, icon or stat
  that does not help the reader decide is cut. One thousand no's for every yes.
- A missing fact is never invented to fill a layout. If a slide feels empty, fix the composition.
- Ask the owner before adding a slide, a section or a kind of content.

## 6. Draw the measured thing, and say what is shape only

Where the paper measured it, draw that data: solid orange, bound to a fact. A curve whose height
the paper does not print is labelled "Shape only, not plotted data". Dashed always means *the
authors' explanation*, so never use a dashed line as decoration or as a marker. Label only the
numbers the cited passages hold; the steps between are bare ticks.

## 7. Accessible as drawn (enforced)

`npm run carousel:parity` refuses a look whose text falls under **4.5:1** on its ground, or whose
button label falls under **3:1** on the orange (`lib/carousel/contrast.ts`). Colours that must be told
apart also differ in lightness, not hue alone. Fix a failure by choosing a passing shade in the
tokens, never by lowering the threshold.

## 8. Judge the deck as a set

A deck is read as a swipe, not as six posters. After every change:

```
npm run content:build        # the lint: words, numbers, kinds, H-rules
npm run carousel:export      # every slide in every look
npm run carousel:sheet       # sheet-<look>.png: one row per deck; openings-<look>.png: A, B, C, D
npm run carousel:parity      # numbers, words, tokens, contrast, PNGs current
```

Open the sheets and look: the headline sizes from slide to slide, a crowded slide next to an empty
one, a drawing that is too small to read at thumbnail size, a look where the orange disappears.
**Satori clips silently**: a slide whose content runs long loses its footer without an error, so
check that every slide still shows its footer (the cite, or Swipe on an opening).
A deck that passes every check can still be ugly; only looking catches that.

## 9. Targeted changes stay targeted

Asked to change one thing (a word, a colour, one slide), change only that. Leave layout, spacing,
sizes and the other slides exactly as they are. If a broader change would help, finish the ask
and suggest the rest.

## Where the design gives way (CLAUDE.md wins)

Kept out of every deck, whatever a design shows:

| In a design | Here |
|---|---|
| A slide counter ("1 / 8") | Position dots: chrome holds no digits |
| Axis numbers, years, DOIs the cited passages do not hold | Only numbers from a passage the slide cites (H7, parity) |
| A dashed line as a marker | A pale band: dashed means "the authors' explanation" |
| A widget slide with example numbers ("50%", "1 of 2") | No new numbers (rule 3); the cta points to the simulator |
| Who before the finding | The owner's order: hook, finding, why, who, receipts, cta |
| Green or another accent | Orange only |
