---
name: science-content
description: Load before editing content/papers/**, content/context/**, content/concepts/**, lib/pipeline/prompts.ts, carousel text, or any wording a reader sees (screens, error messages, the privacy page). Holds content rules H1–H11, the three-layer editorial shape, and the edit → build → read the lint report workflow.
---

# Science content

Every sentence a reader sees is held to H1–H11. Most are enforced by code in
`lib/pipeline/gate.ts` and `lib/pipeline/lint.ts`. **When the gate or the lint refuses something,
fix the content. Never loosen the rule, the word list or the budget to get a paper through.**

## The rules

H1–H8 are copied word for word from `docs/HANDOFF.md`, section 5 (the one place they are
written out). H9–H11 and the amended H7 are copied from `docs/MASTER-PROMPT.md`, Step 2A.

| | Rule | Enforced in |
|---|---|---|
| H1 | No hype words: biohack, superfood, miracle, game-changer, secret, holy grail, boost, skyrocket, shatter, destroy, turbocharge, supercharge, science proves, proven to, life-changing, insane, transform your, optimize your | `lib/pipeline/lint.ts` |
| H2 | Open with the counter-intuitive number or the named mechanism. Any percentage in a headline is absolute or marked relative | prompt + lint |
| H3 | Observational studies never get causal verbs. Trials get them only for the population studied, shown in its own panel | lint |
| H4 | Animal and cell studies never become human protocols; species is a required field | gate |
| H5 | No relative figure without the absolute one; always the effect size and what the weak end of the 95% range means | lint |
| H6 | At least one limitation, shown prominently | lint |
| H7 | Every number in a widget traces to a fact in the paper | build fails on bare numbers |
| H8 | No score claims to measure the body. A tick means an action was taken | scoring design, companion test |

**H7 (amended).** Every number shown to a reader traces to a gated fact, from the paper or from
a gated context source (2B). The UI says which.

**H9 Feynman layer.** Never use a technical term without immediately saying what it physically
does in plain English. Give the mental model first, then the name of the pathway.

**H10 Progressive disclosure.** Every read has three separate layers:

- mechanism: why it happens;
- protocol: what the data supports;
- audit: design, sample size, raw effect size, the mandatory limitation.

No caveats inside the mechanism layer. The audit stays visible without a tap (H6).

**H11 Voice.** Short sentences, active voice, no academic throat-clearing.

## The three-layer editorial shape

`content/papers/<slug>/editorial.json` (schema: `lib/pipeline/editorial.ts`). The old flat shape
(`sections`, top-level `limitations`) is refused for a published paper.

```jsonc
{
  "hook": "...",                 // H2: the number or the named mechanism
  "populationPanel": "...",      // H3: who this was tested in (shown inside the protocol layer)
  "primaryEstimate": "fact_id",  // the headline result
  "layers": {
    "mechanism": {               // why it happens. At most 350 words. No caveats (H10).
      "paragraphs": ["..."],     // model first, then the name (H9)
      "figure": { "figure": "id", "caption": "...", "alt": "..." }   // or null; any layer may have one
    },
    "protocol": {                // what the data supports. At most 150 words.
      "paragraphs": ["..."]      // the tested parameters
    },
    "audit": {                   // the receipts. At most 250 words. Always visible (H6).
      "effect": "...",           // the raw effect size, citing primaryEstimate
      "weakEnd": "...",          // both ends of the 95% range and what the weak end means (H5)
      "limitations": ["..."],    // each cites a limitation fact (H6)
      "missed": "...",           // what most summaries leave out
      "more": ["..."]            // the rest, behind "Full receipts"
    }
  },
  "glossary": [{ "term": "adenosine", "plain": "a chemical that piles up while you are awake" }]
}
```

Markup is unchanged: every sentence ends with `[fact_id, ...]` or `[-]`. A `[-]` sentence may
carry no number and no causal verb. Design and sample size in the receipts come from the gate,
never from the editorial.

What the lint checks on the layers (`npm run content:build` prints all of it):

- A word on the jargon list (`lib/pipeline/jargon.ts`) in the hook, the population panel, the
  mechanism or the protocol needs a glossary entry, and may not sit in the opening sentence of
  the mechanism. A glossary entry's plain text may not use a listed word, a number or a banned
  word.
- Mechanism text may not contain: limitation, confound, self-reported, "p =", "p<", 95%, CI,
  sample size, dropout, funded.
- No throat-clearing: "it is worth noting", "it should be noted", "it is important to note",
  "interestingly", "notably", "the authors observed that", "the results suggest that it may".
- A sentence over 30 words fails; over 22 warns. Passive voice warns. Both are checked on every
  sentence a reader sees, the carousel included.
- Word budgets: mechanism 350, protocol 150, audit 250. The build prints each layer's words,
  average sentence and longest sentence.
- The audit's `effect` must cite `primaryEstimate`; `weakEnd` must give both ends of its 95%
  range, or say in so many words that the paper reports "no confidence interval".
- A figure's caption and alt text are markup too: a number in either cites its fact.

## Workflow

1. Edit the source JSON: `content/papers/<slug>/editorial.json` (or a file in `content/context/`
   or `content/concepts/`). Never edit `lib/content/generated.ts`, `content/generated/*` or
   `supabase/seed.sql`.
2. `npm run content:build`.
3. Read the lint report: each line is `[rule] where: message`.
4. Fix the content and run it again. Never the rule.
5. A number needs a fact: if the fact is not in `extraction.json` with a verbatim quote, the
   number does not go in the read. Background ideas that are not in the paper go in a concept
   file (no digits; the owner approves each one with `npm run paper -- approve-concept <slug>`).

## Two examples

**H9, the caffeine model: the picture first, then the name.**

- Bad: "Caffeine is an adenosine receptor antagonist that attenuates sleep pressure."
  (Three technical words, no picture, and the reader learns nothing they can see.)
- Good: "All day, a sleepiness chemical piles up in your brain and slots into locks that make
  you drowsy. Caffeine is a placeholder key in the sleepiness lock: it fits, it turns nothing,
  and it keeps the real key out. The real key is called adenosine."

**H3, an observational finding with no causal verb.**

- Bad: "Walking 8,000 steps on two days a week lowers your risk of death by 14.9%."
  (A cohort cannot show that the walking did it; and an absolute difference is not "% lower".)
- Good: "People who reached 8,000 steps on one or two days a week had a death rate 14.9 points
  lower over ten years than people who never did. The study watched; it did not assign the
  walking, so it cannot say the steps were the reason."
